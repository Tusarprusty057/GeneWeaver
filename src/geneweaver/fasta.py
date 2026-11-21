
from pathlib import Path


def read_fasta(file_path):
    """Read DNA sequences from a FASTA file.

    Returns:
        A dictionary containing FASTA headers and sequences.
    """
    sequences = {}
    current_header = None
    current_sequence = []

    valid_bases = set("ACGTN")

    with open(file_path, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()

            if not line:
                continue

            if line.startswith(">"):
                if current_header is not None:
                    sequence = "".join(current_sequence).upper()

                    if not sequence:
                        raise ValueError(
                            f"Sequence is empty for header: {current_header}"
                        )

                    if not set(sequence).issubset(valid_bases):
                        raise ValueError(
                            f"Invalid DNA characters in: {current_header}"
                        )

                    if current_header in sequences:
                        raise ValueError(
                            f"Duplicate FASTA header: {current_header}"
                        )

                    sequences[current_header] = sequence

                current_header = line[1:].strip()

                if not current_header:
                    raise ValueError("FASTA header cannot be empty.")

                current_sequence = []

            else:
                if current_header is None:
                    raise ValueError(
                        "Sequence data found before FASTA header."
                    )

                current_sequence.append(line)

    if current_header is not None:
        sequence = "".join(current_sequence).upper()

        if not sequence:
            raise ValueError(
                f"Sequence is empty for header: {current_header}"
            )

        if not set(sequence).issubset(valid_bases):
            raise ValueError(
                f"Invalid DNA characters in: {current_header}"
            )

        if current_header in sequences:
            raise ValueError(
                f"Duplicate FASTA header: {current_header}"
            )

        sequences[current_header] = sequence

    return sequences
