# @ianescober/Leaflet.Draw
A fork of [Leaflet.Draw](https://github.com/Leaflet/Leaflet.draw) that contains several fixes to drawing, editing, and deleting shapes.

## Fixes
- [x] Assigned undeclared radius variable in _resize function ([Edit.Circle.js](https://github.com/IanEscober/Leaflet.draw/blob/develop/src/edit/handler/Edit.Circle.js))
- [x] Added _tooltip instance check when removing hooks ([EditToolbar.Delete.js](https://github.com/IanEscober/Leaflet.draw/blob/develop/src/edit/handler/EditToolbar.Edit.js))
- [x] Added _deletedLayers instance check removing layers and disabling layer deleting ([EditToolbar.Delete.js](https://github.com/IanEscober/Leaflet.draw/blob/develop/src/edit/handler/EditToolbar.Delete.js))

## Maintenance
This fork will not provide fixes to every issue of the original repo. It will only contain fixes raised in this fork or issues encountered by the projects dependent on this fork.

## License
[MIT](https://github.com/IanEscober/Leaflet.draw/blob/master/License)
