
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
