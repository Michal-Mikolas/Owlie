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

    var ruleRows00 = Model.getData('Erasmus: Match buddies', 9, 1);
    var ruleRows0 = Model.sql(
      'SELECT * FROM ?',
      [Model.getData('Erasmus: Match buddies', 9, 1)]
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

      // And each buddy...
      for (let j in buddyRows) {
        var buddyRow = buddyRows[j];

        var erasmusRowsSimulation = owlie_erasmusMatchBuddies.simulateBuddy(erasmusRows, j, buddyRow);
        buddyRow['_score'] = owlie_erasmusMatchBuddies.calculateBuddyScore(erasmusRowsSimulation, j, ruleRows);

        erasmusRow['_buddies'].push(buddyRow);
      }

      // Find the best match <3
      if (!erasmusRow['_buddy']) {  // buddy can be already assigned because of groups
        erasmusRow['_buddy'] = erasmusRow['_buddies'].reduce(function(prev, current) {
          return (prev['_score'] > current['_score']) ? prev : current
        })
      }

      // Write into sheet
      erasmusRow['Buddy e-mail'] = erasmusRow['_buddy']['E-mail'];  // TODO settings['Fill buddy info (from -> to; ...)']
      erasmusRow['Buddy score'] = erasmusRow['_buddy']['_score'];
      Model.saveRow(erasmusRow);

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
  simulateBuddy: function(erasmusRows, i, buddyRow) {
    // Clone data
    erasmusRows = JSON.parse(JSON.stringify(erasmusRows));

    // Assign buddy
    var erasmusRow = erasmusRows[i];
    erasmusRow['_buddy'] = buddyRow;

    // Groups?
    if (erasmusRow['Group']) {  // TODO settings['Group column']
      for (let j in erasmusRows) {
        var otherErasmus = erasmusRows[j];
        if (otherErasmus['Group'] == erasmusRow['Group']) {
          otherErasmus['_buddy'] = erasmusRow['_buddy'];
        }
      }
    }

    // Finish
    return erasmusRows;
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
    var score = 0;
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
        score += ruleRow['Score'];
      }
    }

    // 3) FINISH
    return score;
  },

}
