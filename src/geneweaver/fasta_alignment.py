
from geneweaver.alignment import needleman_wunsch
from geneweaver.fasta import read_fasta


def align_fasta_sequences(file_path, sequence_id_1, sequence_id_2,
                          match_score=1, mismatch_score=-1,
                          gap_penalty=-1):
    """Align two sequences selected from a FASTA file."""

    sequences = read_fasta(file_path)

    if sequence_id_1 not in sequences:
        raise ValueError(f"Sequence not found: {sequence_id_1}")

    if sequence_id_2 not in sequences:
        raise ValueError(f"Sequence not found: {sequence_id_2}")

    result = needleman_wunsch(
        sequences[sequence_id_1],
        sequences[sequence_id_2],
        match_score=match_score,
        mismatch_score=mismatch_score,
        gap_penalty=gap_penalty
    )

    return {
        "sequence_id_1": sequence_id_1,
        "sequence_id_2": sequence_id_2,
        **result
    }
