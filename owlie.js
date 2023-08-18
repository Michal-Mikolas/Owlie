/**
 * @package Owlie
 * @author Michal Mikolas <nanuqcz@gmail.com>
 * @license MIT
 */

function buildMenu() {
  var ui = SpreadsheetApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('Owlie')
    .addItem('Erasmus: Guess groups', 'owlie_erasmusGuessGroups')
    .addItem('Erasmus: Match buddies', 'owlie_erasmusMatchBuddies.run')
    .addItem('Tool: Send bulk e-mails', 'owlie_toolSendBulkEmails')
    .addItem('Owlie: Hello', 'owlie_owlieHello')
    .addItem('Owlie: About', 'owlie_owlieAbout')
    .addToUi();
}
