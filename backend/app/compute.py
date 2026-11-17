"""Candidate scoring on CPU (NumPy, reference) and GPU (Numba CUDA, optional) + benchmark.
Score per guide: GC count and mismatches vs a reference guide. This is NOT GPU dynamic-programming alignment."""
import os, platform, statistics, sys, time
from functools import lru_cache
import numpy as np

ALGO_VERSION = "1.0"
_LUT = np.zeros(256, dtype=np.uint8)
for _i, _c in enumerate("ACGT"):
    _LUT[ord(_c)] = _i


def encode(guides):
    """list of equal-length ACGT strings -> uint8 matrix (A0 C1 G2 T3)."""
    raw = np.frombuffer("".join(guides).encode("ascii"), dtype=np.uint8)
    return _LUT[raw].reshape(len(guides), len(guides[0]))


def cpu_score(arr, ref):
    gc = ((arr == 1) | (arr == 2)).sum(axis=1, dtype=np.int32)
    mm = (arr != ref).sum(axis=1, dtype=np.int32)
    return gc, mm


@lru_cache(maxsize=1)
def gpu_status():
    try:
        from numba import cuda
    except ImportError:
        return {"available": False, "reason": "numba not installed (optional: pip install -r requirements-gpu.txt)"}
    try:
        if not cuda.is_available():
            return {"available": False, "reason": "No CUDA GPU / driver detected"}
        d = cuda.get_current_device()
        name = d.name.decode() if isinstance(d.name, bytes) else d.name
        return {"available": True, "name": name, "compute_capability": list(d.compute_capability),
                "framework": "numba.cuda"}
    except Exception as e:  # hardware probe: report reason to user, do not crash
        return {"available": False, "reason": f"CUDA init failed: {e}"}


def _cpu_name():
    try:
        with open("/proc/cpuinfo") as f:
            for line in f:
                if line.startswith("model name"):
                    return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or platform.machine()


def hardware():
    return {"cpu": _cpu_name(), "cpu_cores": os.cpu_count(), "os": platform.platform(), "gpu": gpu_status()}


def software():
    import Bio
    v = {"algorithm": ALGO_VERSION, "python": sys.version.split()[0], "numpy": np.__version__, "biopython": Bio.__version__}
    try:
        import numba
        v["numba"] = numba.__version__
    except ImportError:
        pass
    return v


_kernel = None


def _get_kernel():
    global _kernel
    if _kernel is None:
        from numba import cuda

        @cuda.jit
        def k(arr, ref, gc, mm):
            i = cuda.grid(1)
            if i < arr.shape[0]:
                g = 0
                m = 0
                for j in range(arr.shape[1]):
                    v = arr[i, j]
                    if v == 1 or v == 2:
                        g += 1
                    if v != ref[j]:
                        m += 1
                gc[i] = g
                mm[i] = m
        _kernel = k
    return _kernel


def gpu_score(arr, ref):
    """Returns gc, mm, timings(ms). Synchronises around each phase so timings are real."""
    from numba import cuda
    k, n = _get_kernel(), arr.shape[0]
    t0 = time.perf_counter()
    d_arr, d_ref = cuda.to_device(arr), cuda.to_device(np.ascontiguousarray(ref))
    d_gc, d_mm = cuda.device_array(n, dtype=np.int32), cuda.device_array(n, dtype=np.int32)
    cuda.synchronize(); t1 = time.perf_counter()
    k[(n + 255) // 256, 256](d_arr, d_ref, d_gc, d_mm)
    cuda.synchronize(); t2 = time.perf_counter()
    gc, mm = d_gc.copy_to_host(), d_mm.copy_to_host()
    t3 = time.perf_counter()
    del d_arr, d_ref, d_gc, d_mm  # let numba free device memory
    return gc, mm, {"h2d_ms": (t1 - t0) * 1e3, "kernel_ms": (t2 - t1) * 1e3,
                    "d2h_ms": (t3 - t2) * 1e3, "total_ms": (t3 - t0) * 1e3}


def _stats(xs):
    return {"mean": statistics.fmean(xs), "median": statistics.median(xs),
            "std": statistics.pstdev(xs) if len(xs) > 1 else 0.0, "min": min(xs)}


def benchmark(sizes, repeats=5, guide_len=20, seed=42):
    """Same seeded random guides go to CPU and GPU. Results are checked for equality.
    Input is synthetic random DNA (stated in output). Real GPU numbers only if a GPU exists."""
    gpu_ok = gpu_status()["available"]
    rows = []
    for n in sizes:
        rng = np.random.default_rng(seed)
        arr = rng.integers(0, 4, size=(n, guide_len), dtype=np.uint8)
        ref = arr[0].copy()
        cpu_score(arr, ref)  # warm-up
        cpu_t = []
        for _ in range(repeats):
            t = time.perf_counter(); cg, cm = cpu_score(arr, ref); cpu_t.append((time.perf_counter() - t) * 1e3)
        row = {"n": n, "cpu_ms": _stats(cpu_t), "gpu": None}
        if gpu_ok:
            gpu_score(arr, ref)  # warm-up (JIT compile + context)
            runs, ok = [], True
            for _ in range(repeats):
                gg, gm, tm = gpu_score(arr, ref)
                ok = ok and np.array_equal(gg, cg) and np.array_equal(gm, cm)
                runs.append(tm)
            g = {key: _stats([r[key] for r in runs]) for key in runs[0]}
            row["gpu"] = g
            row["verified"] = bool(ok)
            row["speedup_total"] = row["cpu_ms"]["median"] / g["total_ms"]["median"]
            row["speedup_kernel"] = row["cpu_ms"]["median"] / g["kernel_ms"]["median"]
        rows.append(row)
    return {"rows": rows, "repeats": repeats, "guide_len": guide_len, "seed": seed,
            "input": "synthetic random guides (seeded, identical for CPU and GPU)",
            "hardware": hardware(), "software": software(), "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
