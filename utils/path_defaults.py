# This file is part of the mitoTree project and authored by Noah Hurmer.
#
# Copyright 2024, Noah Hurmer & mitoTree.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.


import os

# default file paths used during the 'tree_dat_process' script.
# paths denoted are relative to root.

# raw files needed in inputfiles
INPUT_DIR = "inputfiles"

XML_FILE = os.path.join(INPUT_DIR, "mitoTree_phm.xml")
HGMOTIFS_FILE = os.path.join(INPUT_DIR, "mitoTree_hgmotifs.csv")

COLORCODE_FILE = os.path.join(INPUT_DIR, "superhaplo_colorcodes.csv")
SUPERHAPLO_FILE = os.path.join(INPUT_DIR, "superhaplogroups.txt")
PHYLO_SUPERHAPLO_FILE = os.path.join(INPUT_DIR, "phylo_superhaplogroups.txt")



# inputs
ALL_REPS = os.path.join(INPUT_DIR, "mito_representatives.csv")

EMPOP_REPS = os.path.join(INPUT_DIR, "empop_representatives.csv")
EMPOP_META = os.path.join(INPUT_DIR, "empop_metadata.csv")

K_META = os.path.join(INPUT_DIR, "1000G_metadata.csv")

NCBI_REPS = os.path.join(INPUT_DIR, "ncbi_representatives.csv")
NCBI_META = os.path.join(INPUT_DIR, "ncbi_metadata.csv")

# output dir
OUTPUT_DIR = os.path.join(INPUT_DIR, "formatted_files")

# outputs
FORMATTED_EMPOP = os.path.join(OUTPUT_DIR, "empop_representatives_formated.csv")
FORMATTED_1K = os.path.join(OUTPUT_DIR, "k_genomes_representatives_formated.csv")
FORMATTED_NCBI = os.path.join(OUTPUT_DIR, "ncbi_genomes_representatives_formated.csv")

MOTIF_REPRESENTATIVES = os.path.join(OUTPUT_DIR, "representatives_combined.csv")
METADATA_REPRESENTATIVES = os.path.join(OUTPUT_DIR, "metadata_combined.csv")

# destination where to write files
# this should be the data dir within the dir used to build the webpage
DATA_DEST = "docs/data"
