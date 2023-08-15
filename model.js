/**
 * Bootloader and entry point
 * @public
 */
function loadAlasql() {
  loader_.call(this);
  return alasql;
}


/**
 * Model
 * @package Owlie
 * @author Michal Mikolas <nanuqcz@gmail.com>
 * @license MIT
 */
var Model = {

  /**
   * Runs SQL against given data. E.g.:
   *   var people = [
   *     {Name: 'John', Surname: 'Doe', Age: 26},
   *     {Name: 'Will', Surname: 'Smiwh', Age: 37},
   *   ];
   *   var youngPeople = Model.sql(
   *     'SELECT * FROM ? WHERE age < ?',
   *     [people, 30]
   *   );
   */
  sql: function(sql, args) {
    if (typeof alasql === 'undefined') {
      loadAlasql();
    }

    var result = alasql(sql, args);

    return result;
  },

  /**
   * Fetches data from sheet into list of objects
   */
  getData: function(sheetName, firstRow=1, firstColumn=1, numRows=null, numColumns=null) {
    // 1) READ DATA
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName(sheetName);

    // using `getRange`
    if (numRows && numColumns) {
      var range = sheet.getRange(firstRow, firstColumn, numRows, numColumns);
      var data = range.getValues();

    // using `getDataRange`
    } else {
      var range = sheet.getDataRange();
      var data = range.getValues();

      if (firstRow > 1) {
        data = data.slice(firstRow - 1);
      }
      if (firstColumn > 1) {
        data = data.map(r => r.slice(firstColumn - 1));
      }
    }

    // 2) TRANSFORM DATA
    var result = Model._headerRowToKeys(data);

    // 3) INTERNAL VALUES (for later saving with `Model.saveData()`)
    for (let i in result) {
      result[i]['__sheetName'] = sheetName;
      result[i]['__row'] = i*1 + firstRow + 1;  // +1 because of header row
      result[i]['__columnsMap'] = Model._buildColumnsMap(data, firstColumn);
      result[i]['__originalValues'] = Model._cloneRowValues(result[i]);
    }

    // 4) FINISH
    return result;
  },

  /**
   * Saves the data back to the sheet. Efficiently writes only data that changed.
   */
  saveData: function(data) {
    for (let r in data) {
      Model.saveRow(data[r]);
    }
  },

  /**
   * Saves the data back to the sheet. Efficiently writes only data that changed.
   */
  saveRow: function(row) {
    for (let column in row) {
      var value = row[column];

      // Skip internal values
      if (column.slice(0, 2) == '__') {
        continue;
      }

      // Skip values that didn't change
      if (JSON.stringify(value) == JSON.stringify(row['__originalValues'][column])) {
        continue;
      }

      // Skip values for unexisting columns
      if (!row['__columnsMap'].hasOwnProperty(column)) {
        continue;
      }

      // Write new value
      var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = spreadsheet.getSheetByName(row['__sheetName']);
      var cell = sheet.getRange(row['__row'], row['__columnsMap'][column]);
      cell.setValue(value);
    }
  },

  /**
   *
   */
  createTables: function(tables) {
    for (let name in tables) {
      Model.createTable(name, tables[name]);
    }
  },

  /**
   *
   */
  createTable: function(name, data) {
    Model.sql('DROP TABLE IF EXISTS `' + name + '`');
    Model.sql('CREATE TABLE `' + name + '`');
    Model.sql('INSERT INTO `' + name + '` SELECT * FROM ?', [data]);
  },

  /**
   *
   */
  populateObjectValues: function(text, objects) {
    for (objectName in objects) {
      var object = objects[objectName];

      for (var key in object) {
        var value = object[key];

        text = text.split('[' + objectName + '.' + key + ']').join('"' + value + '"');  // replace
      }
    }

    return text;
  },

  /**
   * Converts this: [
   *   [Name, Surname, Age],
   *   [John, Doe, 26],
   *   [Will, Smish, 37]
   * ]
   *
   * Into this: [
   *   {Name: 'John', Surname: 'Doe', Age: 26},
   *   {Name: 'Will', Surname: 'Smiwh', Age: 37},
   * ]
   */
  _headerRowToKeys: function(data) {
    var result = [];
    for (var i = 1; i < data.length; i++) {  // var i = 1  ...skipping first row
      var obj = {};
      for (let j in data[i]) {
        obj[data[0][j]] = data[i][j];
      }
      result.push(obj);
    }

    return result;
  },

  /**
   * Builds info about which `key` is associated with which column, e.g.:
   * {
   *   'Name': 1,    // `Name` values are in column `A`
   *   'Surname: 2,  // `Surname` values are in column `B`
   *   'Age': 3      // `Age` values are in column `C`
   * }
   */
  _buildColumnsMap: function(data, firstColumn=1) {
    var columnsMap = {};

    for (let i in data[0]) {
      columnsMap[data[0][i]] = i*1 + firstColumn;
    }

    return columnsMap;
  },

  /**
   * Clones row values, skipping internal data or unexisting columns.
   */
  _cloneRowValues: function(row) {
    var result = {};

    for (let column in row) {
      // Skip internal values
      if (column.slice(0, 2) == '__') {
        continue;
      }

      // Skip unexisting columns
      if (!row['__columnsMap'].hasOwnProperty(column)) {
        continue;
      }

      result[column] = JSON.parse(JSON.stringify(row[column]));
    }

    return result;
  },

}
