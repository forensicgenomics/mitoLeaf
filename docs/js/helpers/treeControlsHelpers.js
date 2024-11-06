/*
This file is part of the mitoTree project and authored by Noah Hurmer.

Copyright 2024, Noah Hurmer & mitoTree.

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.
*/


/*
This file contains helper functions for the tree controls on the linear explorable tree page.
It hides/shows tree controls based on screen size.
 */

const smallScreenBoundary = 992;

document.addEventListener('DOMContentLoaded', function () {
    const toggleControlsButton = document.getElementById('toggle-controls-button');
    const treeControls = document.getElementById('tree-controls');

    // event listener of tree controls button to toggle visibility of the controls
    toggleControlsButton.addEventListener('click', function () {
        const isCollapsed = treeControls.classList.contains('show');
        if (isCollapsed) {
            treeControls.classList.remove('show');
        } else {
            treeControls.classList.add('show');
        }
    });

    // check screen size and set visibility of tree controls button
    function checkScreenSize() {
        const isSmallScreen = window.innerWidth < smallScreenBoundary;

        if (isSmallScreen) {
            toggleControlsButton.classList.remove('d-none');
            treeControls.classList.remove('show');
        } else {
            toggleControlsButton.classList.add('d-none');
            treeControls.classList.add('show');
        }
    }

    // upon resizing window, recheck visibility req of controls
    window.addEventListener('resize', checkScreenSize);
    // initially check
    checkScreenSize();
});