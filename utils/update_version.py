# This file is part of the mitoLEAF (formerly mitoTree) project and authored by Noah Hurmer.
#
# Copyright 2024, Noah Hurmer & mitoLEAF.
#
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.


###############################
#
# fetches tree creation data from xml file and
# last ncbi fetch date from last_run_date file.
# writes both to the docs/textfiles/version.md file.
#
################################

import warnings
import os
import re
from utils.path_defaults import (XML_FILE,
                                 LAST_RUN_DATE,
                                 VERSION_OUT_FILE)


def _convert_dotted_date_to_mdY_in_line(line: str) -> str:
    # replace first dd.mm.yyyy in the line with mm-dd-yyyy
    def repl(m):
        d = int(m.group(1))
        mth = int(m.group(2))
        y = int(m.group(3))
        return f"{y}-{mth:02d}-{d:02d}"
    new_line, n = re.subn(r"(\d{1,2})\.(\d{1,2})\.(\d{4})", repl, line, count=1)
    if n == 0:
        warnings.warn("Could not parse date on 'created …' line; leaving as-is")
    return new_line


def update_version_md(
    xml_path = XML_FILE,
    last_run_path = LAST_RUN_DATE,
    out_path = VERSION_OUT_FILE,
) -> None:
    # get verion and date from xml header file
    mito_version = None
    created_line = None

    with open(xml_path, "r", encoding="utf-8") as f:
        in_comment = False
        for line in f:
            s = line.strip()
            if s.startswith("<!--"):
                in_comment = True
                continue
            if in_comment and s.endswith("-->"):
                in_comment = False
                break
            if in_comment:
                if s.lower().startswith("mitotree version") or s.lower().startswith("mitoleaf version"):
                    mito_version = s
                elif s.lower().startswith("created "):
                    created_line = s
            # exit if both found
            if mito_version and created_line:
                continue

    if not mito_version or not created_line:
        warnings.warn("could not find both 'mito(Tree/Leaf) Version …' and 'Created …' lines in the xml header comment")

    # convert dd.mm.yyyy -> mm-dd-yyyy
    created_line = _convert_dotted_date_to_mdY_in_line(created_line)
    # write/clear version.md
    with open(out_path,"w", encoding="utf-8", newline="\n") as out:
        out.write(mito_version + ", " + created_line + "\n")

    # read last run date
    if os.path.exists(last_run_path):
        with open(last_run_path, "r", encoding="utf-8") as f:
            last_run_date = f.read().strip()
            last_run_line = f"latest ncbi profiles fetch: {last_run_date}"
        with open(out_path, "a+", encoding="utf-8", newline="\n") as out:
            out.write("\n" + last_run_line + "\n")
    else:
        warnings.warn("'{last_run_path}' is empty; skipping last-run line.")


if __name__ == "__main__":
    update_version_md()
