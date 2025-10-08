# This file is part of the mitoLEAF (formerly mitoTree) project and authored by Noah Hurmer.
#
# Copyright 2024, Noah Hurmer & mitoLEAF.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.


import os

# default file paths used during the 'tree_dat_process' script.
# paths denoted are relative to root.

# raw files needed in inputfiles
INPUT_DIR = "inputfiles"

##### INPUTS ####
XML_FILE = os.path.join(INPUT_DIR, "mitoLEAF_phm.xml")
MOTIF_SIGNATURES = os.path.join(INPUT_DIR, "mitoLEAF_phm.emp")

COLORCODE_FILE = os.path.join(INPUT_DIR, "superhaplo_colorcodes.csv")
SUPERHAPLO_FILE = os.path.join(INPUT_DIR, "superhaplogroups.txt")
PHYLO_SUPERHAPLO_FILE = os.path.join(INPUT_DIR, "phylo_superhaplogroups.txt")


# reps and meta inputs
######
# Name the res and meta input files like .+_representatives.csv and .+_metadata.csv
# All of those named pairs found in 'inputfiles' will be picked up!
######


#### OUTPUTS ####

# output dir
OUTPUT_DIR = os.path.join(INPUT_DIR, "formatted_files")
# data pipeline log file
PIPELINE_LOG_FILE = os.path.join(OUTPUT_DIR, "pipeline.log")
DIFF_CHECK_DIR = os.path.join(OUTPUT_DIR, "diff_check")
OLD_DAT = os.path.join(DIFF_CHECK_DIR, "diff_check")

# outputs
MOTIF_REPRESENTATIVES = os.path.join(OUTPUT_DIR, "mito_representatives.csv")
METADATA_REPRESENTATIVES = os.path.join(OUTPUT_DIR, "mito_metadata.csv")

# destination where to write files
# this should be the data dir within the dir used to build the webpage
DATA_DEST = "docs/data"

# for version file
LAST_RUN_DATE  = os.path.join(INPUT_DIR, "last_run_date.txt")
VERSION_OUT_FILE    = os.path.join("docs", "textfiles", "version.md")