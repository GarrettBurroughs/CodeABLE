var editor = ace.edit('editor');

editor.setTheme('ace/theme/twilight');
editor.session.setMode('ace/mode/javascript');
editor.setFontSize("16px");
editor.getSession().setUseWrapMode(true);

let session = editor.getSession();
let aceDoc = session.getDocument();

let checkpointNames = [];

// Pre-loaded editor text
editor.insert(`let x = 5;
let y = 2;

// ~ checkpoint: "add"
for (let i = 0; i < 10; i++) {
    y += 1;
}

function calculateMeaning(n1, n2) {
    n1 *= 8;
    n2 %= 5;
    let meaning = n1 + n2;
    return meaning;
}

whatIsLife = calculateMeaning(x, y);
console.log("The meaning of life is " + whatIsLife);`);

function giveFeedback(text, exact) {
    feedbackDisplay(text);

    let characters = [
        '(',
        ')',
        '{',
        '}',
        '[',
        ']',
        ';',
        ':',
        '"',
        "'",
        ',',
        '.'
    ];
    let newWords = [
        ' open parenthesis ',
        ' close parenthesis ',
        ' open curly bracket ',
        ' close curly bracket ',
        ' open square bracket ',
        ' close square bracket ',
        ' semicolon ',
        ' colon ',
        ' double quote ',
        ' single quote ',
        ' comma ',
        ' period '
    ];

    // Removes certain characters to make text-to-speech better
    for (let i = 0; i < text.length; i++) {
        for (let j = 0; j < text.length; j++) {
            for (let k = 0; k < characters.length; k++) {
                let index = text.indexOf(characters[k]);

                if (index >= 0) {
                    let first = text.substring(0, index);
                    let replace = ' ';
                    if (exact) replace = newWords[k];
                    let second = text.substring(index + 1, text.length);

                    text = first + replace + second;
                }
            }
        }
    }

    textToSpeech(text);
    return text;
}

let prevError = '';

function checkError(error) {
    prevError = error;
    return error.message;
}

//adds checkpoints in a loaded file into the system
function loadCheckpoints() {
    let allLines = [];
    allLines = aceDoc.getAllLines().slice();
    let symbol = ' ~ ';

    for (let i = 0; i < allLines.length; i++) {
        if (allLines[i].includes('//' + symbol)) {
            lineSplit = allLines[i].split(' ');

            for (let i = 0; i < lineSplit.length; i++) {
                if (lineSplit[i].includes('~')) {
                    nameIndex = i + 2;

                    name = lineSplit[nameIndex];
                    name = name.substring(1, name.length - 1);

                    checkpointNames.splice(0, 0, name);
                }
            }
        }
    }
}

function runCommand(command) {
    if (command.includes('run')) {
        runProgram();
    } else if (command.includes('go to')) {
        commandGoTo(command);
    } else if (command.includes('read')) {
        commandRead(command);
    } else if (/make|new|create|write/.test(command)) {
        commandMake(command);
    } else if (command.includes('save')) {
        commandSaveFile(command);
    } else if (command.includes('error')) {
        giveFeedback('Full Error: ' + prevError);
    } else if (command.includes('help')) {
        listCommands();
    }
}

function listCommands() {
    giveFeedback('Help coming soon!');
}

// Saves a file, given the name
function commandSaveFile(command) {
    if (command.includes('as')) {
        fileName = command.substring(command.indexOf('as') + 3, command.length);
        if (fileName.includes('.py')) {
            fileName = fileName.split('.py')[0];
        }
        downloadFile(fileName);
    } else {
        downloadFile('script');
    }
}

// Figures out where to go, given the string command
function commandGoTo(command) {
    if (command.includes('line')) {
        let lineNum = getLineFromCommand(command);

        if (lineNum >= 0) {
            if (command.includes('end')) {
                goToLine(lineNum, 1);
            } else goToLine(lineNum, 0);
        }
    } else if (
        command.includes('next') ||
        command.includes('loop') ||
        command.includes('checkpoint')
    ) {
        goToObject(command);
    }
}

// Goes to specific line (loc 0 = start, loc 1 = end)
function goToLine(lineNum, loc) {
    if (loc == 0) {
        editor.gotoLine(lineNum);
    }
    //goes to line below and then goes
    //to the left once (to go to end of prev line)
    else if (loc == 1) {
        let lastLine = editor.session.getLength();
        editor.gotoLine(lineNum + 1);
        editor.navigateLeft(1);
    }
}

function getLineFromCommand(command) {
    let index = 0;
    if (command.length > command.indexOf('line') + 4) {
        index = command.indexOf('line') + 5;
    }
    let lineNum = parseInt(command.substring(index, command.length));
    let lastLine = editor.session.getLength();
    if (lineNum > lastLine) {
        giveFeedback(
            'Line ' +
            lineNum.toString() +
            ' does not exist, last line is ' +
            lastLine.toString(),
            false
        );
        return -1;
    }
    return lineNum;
}

function getLineLength(lineNum) {
    goToLine(lineNum + 1);
    editor.navigateLeft(1);

    return editor.getCursorPosition() + 1;
}

function goToObject(command) {
    if (command.includes('loop')) {
        //if user mentions a checkpoint, goes to it
        for (let name in checkpointNames) {
            if (command.includes(name)) {
                giveFeedback('Going to loop checkpoint ' + name, false);
                goToCheckpoint('loop', name);
            }
        }

        //otherwise, goes to next for loop
        if (command.includes('for')) {
            let line = editor.findNext('for ').startRow;
            let col = editor.findNext('for ').startColumn;

            //TODO
        } else if (command.includes('while')) {
            //TODO
        }
    } else if (command.includes('checkpoint')) {
        for (let name of checkpointNames) {
            if (command.includes(name)) {
                giveFeedback('Going to checkpoint ' + name, false);
                goToCheckpoint('checkpoint', name);
            }
        }
    }
}

const toCamel = (s) => {
    return s.replace(/([-_][a-z])/ig, ($1) => {
        return $1.toUpperCase()
            .replace('-', '');
    });
};

function commandMake(command) {
    if (command.includes('checkpoint')) {
        let index = command.indexOf('checkpoint');
        if (command.length > index + 10) {
            let line = editor.getCursorPosition().row + 1;
            makeCheckpoint('checkpoint', command.substring(index + 11), line);
        }
    }
    else if (command.includes('loop')) {
        let line = command.substring(command.indexOf('loop') + 5).split(' ');
        let counter, start, end;
        if (line.includes('length')) {
            let index = line.indexOf('length');
            line.splice(line[index], 2);
            line.push(line[line.length - 1]);
        }
        if (line.includes('with')) {
            counter = line[line.indexOf('with') + 1];
        }
        if (line.includes('from')) {
            start = line[line.indexOf('from') + 1];
        }
        if (line.includes('to')) {
            end = line[line.indexOf('to') + 1];
        }
        makeForLoop(counter, start, end)
    }
    else if (command.includes('function')) {
        command = command.replace(/(parameter|parameters)/g, '');
        let line = command.substring(command.indexOf('function') + 9).split(' ');
        let name, parameters;
        if (line[0] == 'named' || line[0] == 'called') {
            line.shift();
        }
        if (line.includes('with')) {
            parameters = line.splice(line.indexOf('with') + 1);
            line.pop();
        }
        name = toCamel(line.join("-"));
        makeFunction(name, parameters.filter(Boolean));
    }
}

function commandRead(command) {
    if (command.includes('this line') || command.includes('current line')) {
        let row = editor.getCursorPosition().row;
        let col = getLineLength(row + 1) - 1;
        let Range = ace.require('ace/range').Range;
        if (command.includes('exact')) giveFeedback(read(row, row), true);
        else giveFeedback(read(row, row), false);
    } else if (command.includes('line')) {
        let row = getLineFromCommand(command) - 1;
        goToLine(row + 1);
        let col = getLineLength(row + 1) - 1;
        let Range = ace.require('ace/range').Range;
        if (command.includes('exact')) giveFeedback(read(row, row), true);
        else giveFeedback(read(row, row), false);
    } else if (command.includes('this block')) {
        let start = editor.getCursorPosition().row;
        let end = 0;
        for (let i = 0; i < editor.session.getLength(); i++) {
            if (aceDoc.getLine(start + i) == '') {
                end = start + i;
            }
        }
        giveFeedback(read(start, end));
    }
}

function read(from_row, to_row) {
    let lines = aceDoc.getLines(from_row, to_row);
    let result = '';
    result += lines[0];
    for (let i = 1; i < lines.length; i++) {
        lines[i] = lines[i].trim();
        result += lines[i] + '$';
    }
    if (result.charAt(result.length - 1) == '$') {
        result = result.substring(0, result.length - 1);
    }
    if (result.includes('$$')) {
        result = result.substring(0, result.indexOf('$$'));
    }
    return result.replace('\t', '').trim();
}

function makeForLoop(count = 'i', start = 0, end = parseInt(start) + 10) {
    let tabs = editor.getCursorPositionScreen().column / 4;
    let blockEnd = `{\n${'\t'.repeat(tabs + 1)}\n${'\t'.repeat(tabs)}}`;
    let loop = `for (let ${count} = ${start}; ${count} < ${end}; i++) ${blockEnd}`;
    session.insert(editor.getCursorPosition(), loop);
    goToLine(editor.getCursorPosition().row, 1);
    giveFeedback("Loop created on line " + editor.getCursorPosition().row);
}

function makeFunction(name, parameters = []) {
    let tabs = editor.getCursorPositionScreen().column / 4;
    let blockEnd = `{\n${'\t'.repeat(tabs + 1)}\n${'\t'.repeat(tabs)}}`;
    let func = `function ${name}(${parameters.join(', ')}) ${blockEnd}`;
    session.insert(editor.getCursorPosition(), func);
    goToLine(editor.getCursorPosition().row, 1);
}

function makeVariable(name, type = 'let') {
    
}

function makeCheckpoint(type, name, line) {
    goToLine(line, 1);
    let symbol = ' ~ ';
    let comment = '//' + symbol + type + ': "' + name + '"';
    session.insert(editor.getCursorPosition(), comment);
    checkpointNames.splice(0, 0, name);
}

function goToCheckpoint(type, name) {
    let allLines = [];
    allLines = aceDoc.getAllLines().slice();
    let symbol = ' ~ ';
    let comment = '//' + symbol + type + ': "' + name + '"';

    for (let i = 0; i < allLines.length; i++) {
        if (allLines[i].includes(comment)) {
            goToLine(i + 2, 0);
            giveFeedback('Now at ' + type + ' ' + name, false);
            return;
        }
    }

    giveFeedback(
        "Checkpoint '" + name + "' of type '" + type + "' does not exist",
        false
    );
}
