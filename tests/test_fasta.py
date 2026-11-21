
import pytest

from geneweaver.fasta import read_fasta


def test_read_single_fasta(tmp_path):
    fasta_file = tmp_path / "single.fasta"
    fasta_file.write_text(">sequence1\nACGTACGT\n")

    result = read_fasta(fasta_file)

    assert result == {"sequence1": "ACGTACGT"}


def test_read_multiple_fasta(tmp_path):
    fasta_file = tmp_path / "multiple.fasta"
    fasta_file.write_text(
        ">sequence1\nACGT\n"
        ">sequence2\nTGCA\n"
    )

    result = read_fasta(fasta_file)

    assert result == {
        "sequence1": "ACGT",
        "sequence2": "TGCA"
    }


def test_multiline_sequence(tmp_path):
    fasta_file = tmp_path / "multiline.fasta"
    fasta_file.write_text(">sequence1\nACGT\nTGCA\n")

    result = read_fasta(fasta_file)

    assert result["sequence1"] == "ACGTTGCA"


def test_lowercase_sequence(tmp_path):
    fasta_file = tmp_path / "lowercase.fasta"
    fasta_file.write_text(">sequence1\nacgt\n")

    result = read_fasta(fasta_file)

    assert result["sequence1"] == "ACGT"


def test_invalid_dna_sequence(tmp_path):
    fasta_file = tmp_path / "invalid.fasta"
    fasta_file.write_text(">sequence1\nACGX\n")

    with pytest.raises(ValueError):
        read_fasta(fasta_file)


def test_empty_sequence(tmp_path):
    fasta_file = tmp_path / "empty.fasta"
    fasta_file.write_text(">sequence1\n")

    with pytest.raises(ValueError):
        read_fasta(fasta_file)


def test_missing_header(tmp_path):
    fasta_file = tmp_path / "missing_header.fasta"
    fasta_file.write_text("ACGT\n")

    with pytest.raises(ValueError):
        read_fasta(fasta_file)


def test_duplicate_headers(tmp_path):
    fasta_file = tmp_path / "duplicate.fasta"
    fasta_file.write_text(
        ">sequence1\nACGT\n"
        ">sequence1\nTGCA\n"
    )

    with pytest.raises(ValueError):
        read_fasta(fasta_file)

