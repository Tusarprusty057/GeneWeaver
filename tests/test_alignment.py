
import pytest

from geneweaver.alignment import needleman_wunsch


def test_identical_sequences():
    result = needleman_wunsch("ACGT", "ACGT")

    assert result["score"] == 4
    assert result["sequence_1"] == "ACGT"
    assert result["sequence_2"] == "ACGT"


def test_mismatched_sequences():
    result = needleman_wunsch("A", "G")

    assert result["score"] == -1


def test_sequence_with_gap():
    result = needleman_wunsch("ACGT", "AGT")

    assert result["score"] == 2
    assert len(result["sequence_1"]) == len(result["sequence_2"])
    assert result["sequence_1"].replace("-", "") == "ACGT"
    assert result["sequence_2"].replace("-", "") == "AGT"


def test_empty_sequence():
    with pytest.raises(ValueError):
        needleman_wunsch("", "ACGT")


def test_invalid_characters():
    with pytest.raises(ValueError):
        needleman_wunsch("ACGX", "ACGT")


def test_custom_scoring_parameters():
    result = needleman_wunsch(
        "ACGT", "ACGT",
        match_score=2,
        mismatch_score=-1,
        gap_penalty=-2
    )
    assert result["score"] == 8

    result = needleman_wunsch(
        "A", "G",
        match_score=2,
        mismatch_score=-4,
        gap_penalty=-2
    )
    assert result["score"] == -4

    result = needleman_wunsch(
        "ACGT", "AGT",
        match_score=2,
        mismatch_score=-1,
        gap_penalty=-2
    )
    assert result["score"] == 4


def test_lowercase_sequences():
    result = needleman_wunsch("acgt", "acgt")

    assert result["score"] == 4
    assert result["sequence_1"] == "ACGT"
    assert result["sequence_2"] == "ACGT"


def test_sequence_with_unknown_base():
    result = needleman_wunsch("ACNT", "ACNT")

    assert result["score"] == 4
    assert result["sequence_1"] == "ACNT"
    assert result["sequence_2"] == "ACNT"


def test_alignment_score_consistency():
    result = needleman_wunsch(
        "ACGT", "AGT",
        match_score=2,
        mismatch_score=-1,
        gap_penalty=-2
    )

    aligned1 = result["sequence_1"]
    aligned2 = result["sequence_2"]

    calculated_score = 0

    for base1, base2 in zip(aligned1, aligned2):
        if base1 == "-" or base2 == "-":
            calculated_score -= 2
        elif base1 == base2:
            calculated_score += 2
        else:
            calculated_score -= 1

    assert result["score"] == calculated_score
