const MIN_LENGTH_FOR_NSN_ = 2;
const STAR_SIGN_ = "*";
const VALID_ALPHA_ = "A-Za-z";
RFC3966_EXTN_PREFIX_ = ";ext=";

const VALID_DIGITS_ = "0-9\uFF10-\uFF19\u0660-\u0669\u06F0-\u06F9";

const MIN_LENGTH_PHONE_NUMBER_PATTERN_ =
  "[" + VALID_DIGITS_ + "]{" + MIN_LENGTH_FOR_NSN_ + "}";

const VALID_PUNCTUATION =
  "-x\u2010-\u2015\u2212\u30FC\uFF0D-\uFF0F \u00A0\u00AD\u200B\u2060\u3000" +
  "()\uFF08\uFF09\uFF3B\uFF3D.\\[\\]/~\u2053\u223C\uFF5E";

const PLUS_CHARS_ = "+\uFF0B";

const VALID_PHONE_NUMBER_ =
  "[" +
  PLUS_CHARS_ +
  "]*(?:[" +
  VALID_PUNCTUATION +
  STAR_SIGN_ +
  "]*[" +
  VALID_DIGITS_ +
  "]){3,}[" +
  VALID_PUNCTUATION +
  STAR_SIGN_ +
  VALID_ALPHA_ +
  VALID_DIGITS_ +
  "]*";

function extnDigits_(maxLength) {
  return "([" + VALID_DIGITS_ + "]" + "{1," + maxLength + "})";
}

function createExtnPattern_() {
  // We cap the maximum length of an extension based on the ambiguity of the way
  // the extension is prefixed. As per ITU, the officially allowed length for
  // extensions is actually 40, but we don't support this since we haven't seen real
  // examples and this introduces many false interpretations as the extension labels
  // are not standardized.
  /** @type {string} */
  var extLimitAfterExplicitLabel = "20";
  /** @type {string} */
  var extLimitAfterLikelyLabel = "15";
  /** @type {string} */
  var extLimitAfterAmbiguousChar = "9";
  /** @type {string} */
  var extLimitWhenNotSure = "6";

  /** @type {string} */
  var possibleSeparatorsBetweenNumberAndExtLabel = "[ \u00A0\\t,]*";
  // Optional full stop (.) or colon, followed by zero or more spaces/tabs/commas.
  /** @type {string} */
  var possibleCharsAfterExtLabel = "[:\\.\uFF0E]?[ \u00A0\\t,-]*";
  /** @type {string} */
  var optionalExtnSuffix = "#?";

  // Here the extension is called out in more explicit way, i.e mentioning it obvious
  // patterns like "ext.".
  /** @type {string} */
  var explicitExtLabels =
    "(?:e?xt(?:ensi(?:o\u0301?|\u00F3))?n?|\uFF45?\uFF58\uFF54\uFF4E?|\u0434\u043E\u0431|anexo)";
  // One-character symbols that can be used to indicate an extension, and less
  // commonly used or more ambiguous extension labels.
  /** @type {string} */
  var ambiguousExtLabels = "(?:[x\uFF58#\uFF03~\uFF5E]|int|\uFF49\uFF4E\uFF54)";
  // When extension is not separated clearly.
  /** @type {string} */
  var ambiguousSeparator = "[- ]+";
  // This is the same as possibleSeparatorsBetweenNumberAndExtLabel, but not matching
  // comma as extension label may have it.
  /** @type {string} */
  var possibleSeparatorsNumberExtLabelNoComma = "[ \u00A0\\t]*";
  // ",," is commonly used for auto dialling the extension when connected. First
  // comma is matched through possibleSeparatorsBetweenNumberAndExtLabel, so we do
  // not repeat it here. Semi-colon works in Iphone and Android also to pop up a
  // button with the extension number following.
  /** @type {string} */
  var autoDiallingAndExtLabelsFound = "(?:,{2}|;)";

  /** @type {string} */
  var rfcExtn = RFC3966_EXTN_PREFIX_ + extnDigits_(extLimitAfterExplicitLabel);
  /** @type {string} */
  var explicitExtn =
    possibleSeparatorsBetweenNumberAndExtLabel +
    explicitExtLabels +
    possibleCharsAfterExtLabel +
    extnDigits_(extLimitAfterExplicitLabel) +
    optionalExtnSuffix;
  /** @type {string} */
  var ambiguousExtn =
    possibleSeparatorsBetweenNumberAndExtLabel +
    ambiguousExtLabels +
    possibleCharsAfterExtLabel +
    extnDigits_(extLimitAfterAmbiguousChar) +
    optionalExtnSuffix;
  /** @type {string} */
  var americanStyleExtnWithSuffix =
    ambiguousSeparator + extnDigits_(extLimitWhenNotSure) + "#";

  /** @type {string} */
  var autoDiallingExtn =
    possibleSeparatorsNumberExtLabelNoComma +
    autoDiallingAndExtLabelsFound +
    possibleCharsAfterExtLabel +
    extnDigits_(extLimitAfterLikelyLabel) +
    optionalExtnSuffix;
  /** @type {string} */
  var onlyCommasExtn =
    possibleSeparatorsNumberExtLabelNoComma +
    "(?:,)+" +
    possibleCharsAfterExtLabel +
    extnDigits_(extLimitAfterAmbiguousChar) +
    optionalExtnSuffix;

  // The first regular expression covers RFC 3966 format, where the extension is added
  // using ";ext=". The second more generic where extension is mentioned with explicit
  // labels like "ext:". In both the above cases we allow more numbers in extension than
  // any other extension labels. The third one captures when single character extension
  // labels or less commonly used labels are used. In such cases we capture fewer
  // extension digits in order to reduce the chance of falsely interpreting two
  // numbers beside each other as a number + extension. The fourth one covers the
  // special case of American numbers where the extension is written with a hash
  // at the end, such as "- 503#". The fifth one is exclusively for extension
  // autodialling formats which are used when dialling and in this case we accept longer
  // extensions. The last one is more liberal on the number of commas that acts as
  // extension labels, so we have a strict cap on the number of digits in such extensions.
  return (
    rfcExtn +
    "|" +
    explicitExtn +
    "|" +
    ambiguousExtn +
    "|" +
    americanStyleExtnWithSuffix +
    "|" +
    autoDiallingExtn +
    "|" +
    onlyCommasExtn
  );
}

const VALID_PHONE_NUMBER_PATTERN_ = new RegExp(
  "^" +
    MIN_LENGTH_PHONE_NUMBER_PATTERN_ +
    "$|" +
    "^" +
    VALID_PHONE_NUMBER_ +
    "(?:" +
    createExtnPattern_() +
    ")?" +
    "$",
  "i"
);

console.log(VALID_PHONE_NUMBER_PATTERN_);
