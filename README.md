# factorio-recipe-vis
[![Build Status](https://travis-ci.org/kevinta893/factorio-recipe-vis.svg?branch=master)](https://travis-ci.org/kevinta893/factorio-recipe-vis.svg?branch=master)
[![license](https://img.shields.io/badge/license-MIT-green.svg)]()

A visualization of recipes in Factorio using D3.js. It is meant to help visualize the item dependancies of the game's recipes to help organize your factory. Of course, this repository has automated build, test, and deployment in honour of Factorio's gameplay style. 😄

See the visualization [here!](https://kevinta893.github.io/factorio-recipe-vis)

If there are recipe inconsistancies or changes, please refer to the recipe JSON repository: [kevinta893/factorio-recipes-json](https://github.com/kevinta893/factorio-recipes-json)


## How to use
To view items click on the item bar (or press 'e') to open the inventory. Select some items to view by placing them on the bar. You can also adjust the number of that item by click on the item again (hold 'shift' to add 5). Then click outside of the inventory to close (or press 'e' again) and the visualization will update.

Other controls for the visualization:
* Reverse - Reverses the visualization starting with ores on the left
* Spread - Straightens out the visualization
* Show ores - Shows ores from very primative recipes (i.e. iron plates) to the visualization
* Reset - Reset and refreshes the visualization back to the original default view

You can also organize the nodes on the visualization by dragging them into different columns.



## Libraries Used

* d3 v3.5.17
* d3-sankey v0.7.1
* d3-chart v0.3.0
* [q-m/d3-chart-sankey](https://creativecommons.org/licenses/by-nc-sa/3.0/)
* JQuery v3.3.1
* [kevinta893/factorio-recipes-json](https://github.com/kevinta893/factorio-recipes-json)


Icon images credit and copyright under [Creative Commons BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/) from the Factorio Wiki: https://wiki.factorio.com/
