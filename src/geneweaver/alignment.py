
def needleman_wunsch(
    seq1,
    seq2,
    match_score=1,
    mismatch_score=-1,
    gap_penalty=-1
):
    """Perform global alignment using Needleman-Wunsch."""

    seq1 = seq1.upper()
    seq2 = seq2.upper()

    if not seq1 or not seq2:
        raise ValueError("Sequences cannot be empty.")

    valid_bases = set("ACGTN")

    if not set(seq1).issubset(valid_bases):
        raise ValueError("Invalid characters in first sequence.")

    if not set(seq2).issubset(valid_bases):
        raise ValueError("Invalid characters in second sequence.")

    rows = len(seq1) + 1
    cols = len(seq2) + 1

    matrix = [[0] * cols for _ in range(rows)]

    # Initialize gap penalties
    for i in range(rows):
        matrix[i][0] = i * gap_penalty

    for j in range(cols):
        matrix[0][j] = j * gap_penalty

    # Fill scoring matrix
    for i in range(1, rows):
        for j in range(1, cols):

            if seq1[i - 1] == seq2[j - 1]:
                diagonal = matrix[i - 1][j - 1] + match_score
            else:
                diagonal = matrix[i - 1][j - 1] + mismatch_score

            up = matrix[i - 1][j] + gap_penalty
            left = matrix[i][j - 1] + gap_penalty

            matrix[i][j] = max(diagonal, up, left)

    # Traceback
    aligned1 = []
    aligned2 = []

    i = len(seq1)
    j = len(seq2)

    while i > 0 or j > 0:

        if (
            i > 0 and j > 0
            and matrix[i][j] ==
            matrix[i - 1][j - 1] +
            (match_score if seq1[i - 1] == seq2[j - 1]
             else mismatch_score)
        ):
            aligned1.append(seq1[i - 1])
            aligned2.append(seq2[j - 1])
            i -= 1
            j -= 1

        elif i > 0 and matrix[i][j] == matrix[i - 1][j] + gap_penalty:
            aligned1.append(seq1[i - 1])
            aligned2.append("-")
            i -= 1

        else:
            aligned1.append("-")
            aligned2.append(seq2[j - 1])
            j -= 1

    return {
        "score": matrix[-1][-1],
        "sequence_1": "".join(reversed(aligned1)),
        "sequence_2": "".join(reversed(aligned2))
    }
