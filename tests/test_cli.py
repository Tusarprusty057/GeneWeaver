
import pytest

from geneweaver.cli import main


def test_cli_missing_fasta_file(monkeypatch):
    monkeypatch.setattr(
        "sys.argv",
        ["geneweaver", "missing.fasta", "seq1", "seq2"]
    )

    with pytest.raises(SystemExit) as error:
        main()

    assert error.value.code == 2


def test_cli_missing_sequence_id(monkeypatch, tmp_path):
    fasta_file = tmp_path / "sample.fasta"
    fasta_file.write_text(">seq1\nACGT\n", encoding="utf-8")

    monkeypatch.setattr(
        "sys.argv",
        ["geneweaver", str(fasta_file), "seq1", "missing"]
    )

    with pytest.raises(SystemExit) as error:
        main()

    assert error.value.code == 2


def test_cli_invalid_fasta_data(monkeypatch, tmp_path):
    fasta_file = tmp_path / "invalid.fasta"
    fasta_file.write_text(">seq1\nACGTXYZ\n", encoding="utf-8")

    monkeypatch.setattr(
        "sys.argv",
        ["geneweaver", str(fasta_file), "seq1", "seq1"]
    )

    with pytest.raises(SystemExit) as error:
        main()

    assert error.value.code == 2
