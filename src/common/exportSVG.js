// var exporters = {
//   Group: exportGroup,
//   Layer: exportGroup,
//   Raster: exportRaster,
//   Path: exportPath,
//   Shape: exportShape,
//   CompoundPath: exportCompoundPath,
//   SymbolItem: exportSymbolItem,
//   PointText: exportText
// };
//
// export default function exportSVG(item, options, isRoot) {
//   var exporter = exporters[item._class],
//     node = exporter && exporter(item, options);
//   if (node) {
//     var onExport = options.onExport;
//     if (onExport)
//       node = onExport(item, node, options) || node;
//     var data = JSON.stringify(item._data);
//     if (data && data !== '{}' && data !== 'null')
//       node.setAttribute('data-paper-data', data);
//   }
//   return node && applyStyle(item, node, isRoot);
// }
