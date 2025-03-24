# This file is part of the mitoTree project and authored by Noah Hurmer.
#
# Copyright 2024, Noah Hurmer & mitoTree.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.


# helper file to create tree building input file where all sequences are in a single file.

import os
import sys


def create_fst_file(fasta_dir, output_file="sequences.fst"):
    """
    Collects sequences from all FASTA files in 'fasta_dir'.

    Expects each FASTA to have a single sequence and a header
    line (starting with '>') containing the full id.version,
    e.g.: '>KF040496.1 some notes'.

    It writes 'sequences.fst' with the following format:

        #! ALL
        KF040496.1 ? 1 ATATCAGG...
        ...

    :param fasta_dir: Directory containing *.fasta files
    :param output_file: Name of the output .fst file
    """
    print(f"\nConverting directory '{fasta_dir}' to a combined file at '{output_file}'.\nThis may take a while...\n")

    # list of (id_version, sequence)
    records = []

    for filename in os.listdir(fasta_dir):
        if not filename.endswith(".fasta"):
            continue

        filepath = os.path.join(fasta_dir, filename)
        with open(filepath, "r") as f:
            id_version = None
            seq_lines = []

            for line in f:
                line = line.strip()
                if line.startswith(">"):
                    # get "id.version" from header
                    # assuming its the first token
                    header_parts = line[1:].split()
                    id_version = header_parts[0] if header_parts else None
                else:
                    seq_lines.append(line)

            if not id_version:
                print(f"Parsing fasta header unsuccessful for {filepath} ; skipping.")
                continue

            sequence = "".join(seq_lines)
            records.append((id_version, sequence))

    # write to the output file as `id_version ? 1 sequence` line for each file in dir
    with open(output_file, "w", newline="\n") as out_f:
        out_f.write("#! ALL\n")
        for (id_version, seq_str) in records:
            out_f.write(f"{id_version} ? 1 {seq_str}\n")

    print(f"\nWrote {len(records)} sequences to {output_file}.")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python collect_fasta_sequences.py <fasta_directory> [output_file]")
        sys.exit(1)

    fasta_dir = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "sequences.fst"

    create_fst_file(fasta_dir, output_file)
