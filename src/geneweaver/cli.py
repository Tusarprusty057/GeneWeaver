
import argparse

from geneweaver.fasta_alignment import align_fasta_sequences


def main():
    parser = argparse.ArgumentParser(
        description="GeneWeaver DNA Sequence Alignment Tool"
    )

    parser.add_argument(
        "fasta_file",
        help="Path to the input FASTA file"
    )

    parser.add_argument(
        "sequence_id_1",
        help="ID of the first DNA sequence"
    )

    parser.add_argument(
        "sequence_id_2",
        help="ID of the second DNA sequence"
    )

    parser.add_argument(
        "--match-score",
        type=int,
        default=1,
        help="Score for matching bases (default: 1)"
    )

    parser.add_argument(
        "--mismatch-score",
        type=int,
        default=-1,
        help="Penalty for mismatched bases (default: -1)"
    )

    parser.add_argument(
        "--gap-penalty",
        type=int,
        default=-1,
        help="Penalty for gaps (default: -1)"
    )

    args = parser.parse_args()

    try:
        result = align_fasta_sequences(
            args.fasta_file,
            args.sequence_id_1,
            args.sequence_id_2,
            match_score=args.match_score,
            mismatch_score=args.mismatch_score,
            gap_penalty=args.gap_penalty
        )

        print("\nGeneWeaver Alignment Results")
        print("----------------------------")
        print(f"Sequence 1: {result['sequence_id_1']}")
        print(f"Sequence 2: {result['sequence_id_2']}")
        print(f"Match score: {args.match_score}")
        print(f"Mismatch score: {args.mismatch_score}")
        print(f"Gap penalty: {args.gap_penalty}")
        print(f"Alignment score: {result['score']}")
        print(f"Aligned 1: {result['sequence_1']}")
        print(f"Aligned 2: {result['sequence_2']}")

    except (ValueError, OSError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
