<!--
This file is part of the mitoTree project.

Copyright 2024, Noah Hurmer & mitoTree.

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
-->

# Documentation & Usage

This section provides detailed information and guidance on using mitoTree.

<br>

## Notation

**Nucleotide position numbers** are relative to the **rCRS** [GenBank: NC_012920](https://www.ncbi.nlm.nih.gov/nuccore/NC_012920)

**Mutations** are given in the format **[position][evolved base]**. The words "Mutations" and "Variants" are used synonymously.  
The [evolved base] can be one of the following symbols:
- A, C, G, T: representing the four DNA bases (Adenine, Cytosine, Guanine, and Thymine).
- '-'(hyphen): This symbol signifies a deletion.
- Mixed states, indicating uncertainty about the specific base, are denoted by ambiguous symbols. For details, refer to the extended IUPAC code explained in [Parson et al. 2014](https://www.sciencedirect.com/science/article/pii/S1872497314001586?via%3Dihub).
<br>

- **Transitions/Transversions:** our notation does not distinguish between transitions and transversions
(e.g.: the A to G transition at position 750 is noted as '750G'; the C to A transversion at position 16327 is noted as '16327A')
- **Deletions:** noted with a '-' appended to the position, e.g. '249-'
- **Insertions:** noted with a '.' following the position after which the insertion occurred, e.g. '573.1C'. A four basepair insertion at position 368 is noted as '368.1A 368.2G 368.3A 368.4A'
- **Recurrent mutations:** Noted with the base prefixed to the position (i.e. 'T152'). Highlighted in cursive in the HG-Signature on the Haplogroup Info page and not listed in the Full HG-Signature as it describes the state of the rCRS.
<br>

**Colors** in mitoTree adhere to the following color-code:

<span style="border: 2px solid red; padding: 2px 4px; border-radius: 4px; background-color: #ffe5e5;">red</span> for L lineages
<span style="border: 2px solid blue; padding: 2px 4px; border-radius: 4px; background-color: #e5f0ff;">blue</span> for M lineages
<span style="border: 2px solid yellow; padding: 2px 4px; border-radius: 4px; background-color: #ffffe5;">yellow</span> for N lineages
<span style="border: 2px solid green; padding: 2px 4px; border-radius: 4px; background-color: #e5ffe5;">green</span> for R lineages
<span style="border: 2px solid grey; padding: 2px 4px; border-radius: 4px; background-color: #f0f0f0;">grey</span> for L3* lineages

<br>

## Radial Tree

The home page displays a general overview of the mitoTree structure in radial form.  
Only Nodes classified as 'Superhaplogroups' are displayed.  
Nodes where labels are missing are required to reach others but are not part of this classification, thus the labels are omitted.  
Parent nodes not required to depict the structure accurately are omitted completely, and their Superhaplogroup classified descendant bumped up to lower depths. Node depth of this tree is therefore not necessarily accurate.

- **Node On-click:** Click on nodes or their labels to display its respective Haplogroup Info page.
- **Download svg:** Click on the button at the bottom of the page to download that tree visualization as a .svg.

<br>

## Explore mitoTree

Here, the full extent of mitoTree can be explored interactively.  
Haplogroups with descendants are collapsible, meaning their descendants can be shown or hidden.  
Initially, the tree is expanded to reveal all designated ‘Superhaplogroups’.

- **Expand/Collapse Nodes:** Click on a node or its label to expand or collapse its descendants.
- **Node On-click Effect toggle:** Select the desired On-click effect:
  - **Expand Fully:** Clicking on a node will recursively expand/collapse all of its descendants.
  - **Expand:** The default effect of expanding only the direct descendants of a node.
  - **Node Info:** Clicking on a node will redirect you to the haplogroup info page of that node.
- **Reset Tree button:** Reset the tree to its initial rendering. Equivalent to reloading the page.
- **Expand Fully button:** Expands all nodes to show the entire tree. Caution: this may take a while.
- **Name search:** Use the search bar to search for Haplogroups by their name. Only currently expanded Nodes will be searched. The search is case sesitive.  
All matches will be highlighted, and the tree will be centered to show the best match. Use the Prev/Next buttons to navigate through the remaining matches and center them.  
The number of matches will also be displayed next to the search bar.
- **Download svg:** Click the button to download the current tree visualization as a .svg. Customize what is shown beforehand and then download your custom tree visualization.

<br>

## Haplogroup Search

This table displays all Haplogroups with their Name and their HG-Signature.   
Search domains can be combined.  
Reset by deleting from the search fields, reloading the page or with the reset button.

- **Search by Name:** Searching will show all full and partial Name matches to the entered keyword, ordered by relevance.
  - **Case Sensitive toggle:** The search is case-sensitive by default, but can be deselected.
- **Search by HG Signature:** Use the toggle to switch between exact signature match and mutation inheritance modes.  
  You can search for a position by omitting the base/mutation (i.e., '123') or a position & base/mutation pair (i.e. '123A' or '123-', etc.).
  You can also search fur just specific mutations with just the base/mutation/period for insertion (i.e. 'a' or '-' or '.1' or '.').
  You can search multiple positions/mutations at once by separating them with a space or a comma (i.e., '123A 246G'). The search will then attempt to match all entered mutations in the selected mode.
  - **Exact Signature:** Matches any haplogroups that carry all entered positions or mutations in their HG-Signature (the mutation occurred on their level).
  - **Has Mutation:** Matches any haplogroups that carry all entered positions or mutations in their Full HG-Signature (meaning they have these mutations). For example, if HG 'A' has the mutation '123A', its descendants will also be shown when searching for '123' or '123A', unless they have a backmutation or a different mutation at that position.
- **Combine Searches:** Search domains are combined. I.e., search shows only results that match the 'Name' search field entry as well as those of the 'HG Signature' search field or any others present and not empty.
- **Reset Search:** Resets all search domains and shows all Haplogroups again. Equivalent to reloading the page.
- **Download CSV:** Downloads the current filtered table as a .csv.

<br>

## Haplogroup Info

Overview page showing collected attributes of a specific Haplogroup.  
The color bar at the top represents its respective color code, indicating lineage belonging.  
Recurrent mutations are noted in cursive and with the base leading and are only present in the 'HG-Signature' field, not the 'full HG-Signature'.

- **HG-Signature:** Indicates the Haplogroup's HG-Signature.
- **Representative Mitogenomes and Metadata:**
The data shown here are retrieved from NCBI GenBank. In case of missing or "NA", there was no data available at the time of retrieval.
  - **Accession Number:** Lists GenBank accession numbers that are representatives of this haplogroup.
  - **Country:** Information stored under the NCBI FEATURE '/origin'
  - **Technology:** Information stored under the NCBI COMMENT 'Sequencing Technology'
  - **Assembly:** Information stored under the NCBI COMMENT 'Assembly Method'
- **Lineage:** This linear tree displays the Haplogroup's ancestors from mt-MRCA to itself.  
  Click on the various nodes displayed to view their respective Info pages.
- **Descendants:** Lists all direct descendants of this Haplogroup, if it has any.  
  Click on a listed descendant to view it's respective Info page.
- **Full HG-Signature:** Shows the complete signature of the Haplogroup, displaying all variants relative to the rCRS.
The presence of the variants '315.1c 16181M 16182M 16183M 16519Y' in most haplogroups is outlined in [Dür et al. 2021](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8198973/)

