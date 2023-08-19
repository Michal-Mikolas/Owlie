/** function for purpose of debugging */
function owlie_erasmusMatchBuddies_run(){
  owlie_erasmusMatchBuddies.run();
}

/**
 * @package Owlie
 * @author Michal Mikolas <nanuqcz@gmail.com>
 * @license MIT
 */
var owlie_erasmusMatchBuddies = {

  /**
   * Main function of this command
   */
  run: function () {
    /*
     * 1) READ DATA
     */
    var buddyRows = Model.sql(
      'SELECT buddy.* FROM ? AS buddy',
      [Model.getData('Buddy')]
    );

    var ruleRows = Model.sql(
      'SELECT rule.* FROM ? AS rule WHERE Active = "Yes"',
      [Model.getData('Erasmus: Match buddies', 9, 1)]
    );

    /*
     * 2) ASSIGN BUDDIES
     */
    // For each erasmus...
    var i = 0;
    do {
      var erasmusRows = owlie_erasmusMatchBuddies.getErasmusRows();  // need to fetch fresh data every time; every iteration there is change in Erasmus buddy columns
      var erasmusRow = erasmusRows[i];

      erasmusRow['_buddies'] = [];

      // Skip if already has buddy
      if (owlie_erasmusMatchBuddies.hasBuddy(erasmusRow)) {
        i++; continue;
      }

      // And for each buddy...
      for (let j in buddyRows) {
        var erasmusRowsSimulation = owlie_erasmusMatchBuddies.assignBuddy(erasmusRows, i, buddyRows[j]);
        owlie_erasmusMatchBuddies.calculateBuddyScore(erasmusRowsSimulation, i, ruleRows);

        var buddyRow = erasmusRowsSimulation[i]['_buddy'];

        erasmusRow['_buddies'].push(buddyRow);
      }

      // Find the best match <3
      var bestBuddy = erasmusRow['_buddies'].reduce(function(prev, current) {
        return (prev['_score'] > current['_score']) ? prev : current
      })

      // Assign the best match to the buddy
      erasmusRows = owlie_erasmusMatchBuddies.assignBuddy(erasmusRows, i, bestBuddy);

      // Write into sheet
      Model.saveData(erasmusRows);

      i++;
    } while (i < erasmusRows.length);
  },

  /**
   *
   */
  getErasmusRows: function() {
    return Model.sql(
      'SELECT erasmus.* FROM ? AS erasmus',
      [Model.getData('Erasmus')]
    );
  },

  /**
   * Tries to assign buddy to erasmus & his group. Doesn't calculate the score.
   */
  assignBuddy: function(erasmusRows, i, buddyRow) {
    // Clone data
    erasmusRows = JSON.parse(JSON.stringify(erasmusRows));

    // Assign buddy
    var erasmusRow = erasmusRows[i];
    owlie_erasmusMatchBuddies.assignBuddyData(erasmusRow, buddyRow);

    // Groups?
    if (erasmusRow['Group']) {  // TODO settings['Group column']
      /**/console.log('Group (' + erasmusRow['E-mail'] + '): ' + erasmusRow['Group']);
      for (let j in erasmusRows) {
        var otherErasmus = erasmusRows[j];
        if (otherErasmus['Group'] == erasmusRow['Group'] && (i != j)) {
          /**/console.log(erasmusRow['E-mail'] + ' <- ' + otherErasmus['E-mail']);
          owlie_erasmusMatchBuddies.assignBuddyData(otherErasmus, buddyRow);
        }
      }
    }

    // Finish
    return erasmusRows;
  },

  /**
   * Fills buddy data into erasmus row
   */
  assignBuddyData: function(erasmusRow, buddyRow) {
    erasmusRow['_buddy'] = buddyRow;

    erasmusRow['Buddy e-mail'] = buddyRow['E-mail'];  // TODO settings['Fill buddy info (from -> to; ...)']
    erasmusRow['Buddy score'] = buddyRow['_score'];
    erasmusRow['Buddy explanation'] = buddyRow['_explanation'];
  },

  /**
   * Calculates buddy score
   */
  calculateBuddyScore: function(erasmusRows, i, ruleRows) {
    // 1) PREPARE
    var erasmusRow = erasmusRows[i];
    var buddyRow = erasmusRow['_buddy'];

    Model.createTables({
      'Erasmus': erasmusRows,
      'Buddy': Model.getData('Buddy'),
    });

    // 2) CALCULATE SCORE
    buddyRow['_score'] = 0;
    buddyRow['_explanation'] = '';
    for (let j in ruleRows) {
      // Prepare code
      var ruleRow = ruleRows[j];
      var code = Model.populateObjectValues(
        ruleRow['Code'],
        {
          'Erasmus': erasmusRow,
          'Buddy': buddyRow
        }
      );

      // Evaluate code
      var results = Model.sql('SELECT ' + code);
      var firstResultValue = Object.values(results[0])[0];  // first value of the first result
      if (firstResultValue) {
        buddyRow['_score'] += ruleRow['Score'];
        buddyRow['_explanation'] += ruleRow['Description'] + ' [' + ruleRow['Score'] + ']; ';
      }
    }
  },

  /**
   *
   */
  hasBuddy: function(erasmusRow) {
    return erasmusRow['Buddy e-mail'];  // TODO settings['Fill buddy info (from -> to; ...)']
  },

}
