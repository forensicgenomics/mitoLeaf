# This file is part of the mitoTree project and authored by Noah Hurmer.
#
# Copyright 2024, Noah Hurmer & mitoTree.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.


###############################
#
# This script merges the representatives as well as the metadata from the different sources
# (ncbi, empop, 1k_genomes)
#
################################


from os import makedirs

import numpy as np
import pandas as pd

from utils.path_defaults import (ALL_REPS,
                           EMPOP_META,
                           K_META,
                           NCBI_META,
                           OUTPUT_DIR,
                           FORMATTED_EMPOP,
                           FORMATTED_1K,
                           FORMATTED_NCBI,
                           MOTIF_REPRESENTATIVES,
                           METADATA_REPRESENTATIVES)


def filter_profiles(profiles_str, valid_accessions):
    """
    Filter a space-delimited string of accession IDs, returning only those in 'valid_accessions'.
    Returns an empty string if the input is missing or no valid IDs remain.
    """
    if pd.isna(profiles_str) or not profiles_str.strip():
        return ""
    candidates = profiles_str.strip().split()
    filtered = [acc for acc in candidates if acc in valid_accessions]
    return " ".join(filtered)



def process_and_save_reps(meta_file, reps_df, output_file, id_col="accession"):
    """
    Processes and filters 'reps_df' based on a metadata file, then saves the result.

    Parameters
    ----------
    meta_file : str
        Path to the CSV metadata file.
    reps_df : pd.DataFrame
        DataFrame containing 'motif' and 'profiles' columns.
    output_file : str
        Path where the filtered DataFrame should be written as a CSV.
    id_col : str, optional
        Column in the metadata that corresponds to the IDs found in 'profiles'.
        Default is 'accession'. If 'sample_id', then we map them to 'accession' first.

    Returns
    -------
    (pd.DataFrame, pd.DataFrame)
        A tuple of (filtered_reps_df, meta_df).
    """
    meta_df = pd.read_csv(meta_file)

    # create mapping from 'id_col' to 'accession'
    # for example, if id_col='sample_id', we map sample_id -> accession
    # if id_col='accession', then it essentially maps accession -> accession.
    id_map = dict(zip(meta_df[id_col], meta_df["accession"]))

    # accessions found in the metadata
    valid_accessions = set(meta_df["accession"])
    reps_subset = reps_df[["motif", "profiles"]].copy()

    # replace each ID in 'profiles' with the corresponding 'accession'
    if id_col != "accession":
        reps_subset["profiles"] = reps_subset["profiles"].apply(
            lambda x: map_and_replace_ids(x, id_map)
        )

    # filter out any IDs in 'profiles' that are not in 'valid_accessions'
    reps_subset["profiles"] = reps_subset["profiles"].apply(
        lambda x: filter_profiles(x, valid_accessions)
    )

    reps_subset.to_csv(output_file, index=False)

    return reps_subset, meta_df


def map_and_replace_ids(profiles_str, id_map):
    """
    For a space-delimited string of IDs, look up each ID in 'id_map' and replace it
    with the mapped value (e.g. sample_id -> accession). If the ID is not found
    in 'id_map', keep or discard it based on your needs.
    """
    if pd.isna(profiles_str) or not profiles_str.strip():
        return ""
    ids = profiles_str.strip().split()

    # replace each ID using the dictionary; keep if not found or remove it
    mapped = [
        id_map[i] if i in id_map else i
        for i in ids
    ]
    return " ".join(mapped)


def merge_representatives(df1, df2, df3, out_csv):
    """
    Reads three CSVs with columns [motif, profiles].
    Merges them on 'motif', unions the profiles for each motif (removing duplicates),
    and writes a final CSV with columns [motif, profiles].
    """
    df1 = df1.rename(columns={"profiles": "profiles1"})
    df2 = df2.rename(columns={"profiles": "profiles2"})
    df3 = df3.rename(columns={"profiles": "profiles3"})

    # merge all on 'motif'
    merged = (
        df1.merge(df2, on="motif", how="outer")
           .merge(df3, on="motif", how="outer")
    )

    # combine profiles into one space-separated string, no duplicates
    def combine_profiles(row):
        all_profiles = set()
        for col in ["profiles1", "profiles2", "profiles3"]:
            val = row.get(col, np.nan)
            if pd.notna(val):
                all_profiles.update(val.split())
        return " ".join(all_profiles)

    merged["profiles"] = merged.apply(combine_profiles, axis=1)

    final_df = merged[["motif", "profiles"]]

    final_df.to_csv(out_csv, index=False)
    print(f"Merged CSV written to: {out_csv}")


def main():

    makedirs(OUTPUT_DIR, exist_ok=True)

    # read all representations
    # this is the output of the tree building process
    reps_df_all = pd.read_csv(ALL_REPS)

    ############################################################

    # filter all profiles present in the metadata files for each source

    reps_empop, meta_df_empop = process_and_save_reps(EMPOP_META, reps_df_all, FORMATTED_EMPOP, id_col="sample_id")
    reps_1k, meta_df_1k = process_and_save_reps(K_META, reps_df_all, FORMATTED_1K)
    reps_ncbi, meta_df_ncbi = process_and_save_reps(NCBI_META, reps_df_all, FORMATTED_NCBI)

    #############################################################

    # combine reps

    merge_representatives(reps_ncbi, reps_empop, reps_1k,
        out_csv=MOTIF_REPRESENTATIVES
    )

    #############################################################

    # combine metadata

    meta_df_empop.drop("sample_id", axis=1, inplace=True)

    meta_df_empop["source"] = "EMPOP"
    meta_df_1k["source"] = "1K_GENOMES"
    meta_df_ncbi["source"] = "NCBI"

    combined_meta = pd.concat([meta_df_ncbi, meta_df_empop, meta_df_1k], axis=0, ignore_index=True)

    combined_meta.to_csv(METADATA_REPRESENTATIVES, index=False)


    #############################################################

    print("Processing complete!\n")


if __name__ == "__main__":
    main()
