
import pytest

from geneweaver.fasta_alignment import align_fasta_sequences


def test_align_two_fasta_sequences(tmp_path):
    fasta_file = tmp_path / "sample.fasta"
    fasta_file.write_text(
        ">sequence1\nACGT\n"
        ">sequence2\nAGT\n"
    )

    result = align_fasta_sequences(
        fasta_file, "sequence1", "sequence2"
    )

    assert result["sequence_id_1"] == "sequence1"
    assert result["sequence_id_2"] == "sequence2"
    assert result["score"] == 2
    assert len(result["sequence_1"]) == len(result["sequence_2"])


def test_align_identical_sequences(tmp_path):
    fasta_file = tmp_path / "identical.fasta"
    fasta_file.write_text(
        ">sequence1\nACGT\n"
        ">sequence2\nACGT\n"
    )

    result = align_fasta_sequences(
        fasta_file, "sequence1", "sequence2"
    )

    assert result["score"] == 4
    assert result["sequence_1"] == "ACGT"
    assert result["sequence_2"] == "ACGT"


def test_missing_first_sequence(tmp_path):
    fasta_file = tmp_path / "missing.fasta"
    fasta_file.write_text(">sequence1\nACGT\n")

    with pytest.raises(ValueError, match="not found"):
        align_fasta_sequences(
            fasta_file, "missing", "sequence1"
        )


def test_missing_second_sequence(tmp_path):
    fasta_file = tmp_path / "missing.fasta"
    fasta_file.write_text(">sequence1\nACGT\n")

    with pytest.raises(ValueError, match="not found"):
        align_fasta_sequences(
            fasta_file, "sequence1", "missing"
        )


def test_custom_scoring_parameters(tmp_path):
    fasta_file = tmp_path / "custom.fasta"
    fasta_file.write_text(
        ">sequence1\nACGT\n"
        ">sequence2\nACGT\n"
    )

    result = align_fasta_sequences(
        fasta_file,
        "sequence1",
        "sequence2",
        match_score=2,
        mismatch_score=-1,
        gap_penalty=-2
    )

    assert result["score"] == 8
