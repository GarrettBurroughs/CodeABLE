var editor = ace.edit('editor');

editor.setTheme('ace/theme/twilight');
editor.session.setMode('ace/mode/javascript');
editor.setFontSize("18px");
editor.getSession().setUseWrapMode(true);

let session = editor.getSession();
let aceDoc = session.getDocument();

let checkpointNames = [];

// Pre-loaded editor text
editor.insert(`let x = 5;
let y = 2;

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

const toCamel = (s) => {
    return s.replace(/([ ]([a-z]|[0-9]))/ig, ($1) => {
        return $1.toUpperCase().replace(' ', '');
    });
}

const currLine = () => {
    return (editor.getCursorPosition().row + 1);
}

function textToSpeech(text) {
    let msg = new SpeechSynthesisUtterance(text);
    setTimeout(() => {
        window.speechSynthesis.speak(msg);
    }, 0);
}

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

// Adds checkpoints in a loaded file into the system
function loadCheckpoints() {
    checkpointNames = [];
    let allLines = aceDoc.getAllLines().slice();
    let symbol = ' ~ ';
    for (let i = 0; i < allLines.length; i++) {
        if (allLines[i].includes('//' + symbol)) {
            lineSplit = allLines[i].split(' ');
            for (let j = 0; j < lineSplit.length; j++) {
                if (lineSplit[j].includes('~')) {
                    nameIndex = j + 2;
                    name = lineSplit[nameIndex];
                    name = name.substring(1, name.length - 1);
                    checkpointNames.splice(0, 0, name);
                }
            }
        }
    }
}

let commands = {
    run: {
        regex: /(run|execute)/g,
        execute: cmd => {
            commandRun(cmd);
        }
    },
    goTo: {
        regex: /(go to|goto)/g,
        execute: cmd => {
            commandGoTo(cmd);
        }
    },
    read: {
        regex: /read/g,
        execute: cmd => {
            commandRead(cmd);
        }
    },
    make: {
        regex: /(make|new|create|write)/g,
        execute: cmd => {
            commandMake(cmd);
        }
    },
    save: {
        regex: /save/g,
        execute: cmd => {
            commandSaveFile(cmd);
        }
    },
    log: {
        regex: /log/g,
        execute: cmd => {
            commandLog(cmd);
        }
    },
    error: {
        regex: /error/g,
        execute: cmd => {
            giveFeedback('Full Error' + prevError);
        }
    },
    help: {
        regex: /help/g,
        execute: cmd => {
            listCommands();
        }
    },
    list: {
        regex: /list/g,
        execute: cmd => {
            commandList(cmd);
        }
    }
}

// Run the user's command by identifying keywords
function runCommand(cmd) {
    for (let key in commands) {
        if (commands[key].regex.test(cmd)) {
            commands[key].execute(cmd);
            return;
        }
    }
    if (cmd.length < 1) return;
    giveFeedback("Command not recognized")
}

function listCommands() {
    giveFeedback('Help coming soon!');
}

// Saves a file, given the name
function commandSaveFile(cmd) {
    if (cmd.includes('as')) {
        fileName = cmd.substring(cmd.indexOf('as') + 3, cmd.length);
        fileName = fileName.replace('.js', '');
        downloadFile(fileName);
    } else {
        downloadFile('script');
    }
}

// 
function commandRun(cmd) {
    if (cmd.includes('program')) {
        runProgram();
    } else {
        let name, params;
        cmd = cmd.replace(/(parameter|parameters|run|the|function)/g, '').trim();
        if (cmd.includes('with')) {
            params = cmd.substring(cmd.indexOf('with') + 5).trim();
            cmd = cmd.substring(0, cmd.indexOf('with')).trim();
            if (params.includes('string')) {
                params = '"' + params.substring(params.indexOf('string') + 7) + '"';
            }
        }
        let func = toCamel(cmd) + '(' + ((params == undefined) ? '' : params) + ');';
        session.insert(editor.getCursorPosition(), func);
    }
}

// Figures out where to go, given the string command
function commandGoTo(cmd) {
    if (cmd.includes('line')) {
        let lineNum = getLineFromCommand(cmd);
        if (lineNum >= 0) cmd.includes('end') ? goToLine(lineNum, true) : goToLine(lineNum);
        giveFeedback("Now at line " + currLine());
    } else if (/end/g.test(cmd)) {
        goToLine(editor.session.getLength(), true);
        giveFeedback("Now at last line " + currLine());
    } else if (/(next|loop|checkpoint)/g.test(cmd)) {
        goToObject(cmd);
    }
}

function commandLog(cmd) {
    cmd = cmd.substring(cmd.indexOf('log') + 4);
    if (/string/g.test(cmd)) {
        cmd = '"' + cmd.substring(cmd.search(/string/g) + 7) + '"';
    }
    if (/(variable|constant)/g.test(cmd)) {
        cmd = toCamel(cmd.substring(cmd.search(/(variable|constant)/g) + 9));
    }
    let log = `console.log(${cmd});\n`;
    session.insert(editor.getCursorPosition(), log);
    giveFeedback("Logged on line " + currLine());
}

function commandList(cmd) {
    if (cmd.includes('checkpoint')) {
        loadCheckpoints();
        if (checkpointNames.length > 0) {
            giveFeedback('Current checkpoints: ' + checkpointNames.join(', '));
        } else {
            giveFeedback('No checkpoints found', true);
        }
    }
}

function commandMake(cmd) {
    if (cmd.includes('checkpoint')) {
        let index = cmd.indexOf('checkpoint');
        if (cmd.length > index + 10) {
            let loc = currLine();
            let line = cmd.substring(index + 11).split(' ');
            if (line[0] == 'named' || line[0] == 'called') line.shift();
            makeCheckpoint('checkpoint', toCamel(line.join(' ')), loc);
        }
    } else if (cmd.includes('loop')) {
        let line = cmd.substring(cmd.indexOf('loop') + 5).split(' ');
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
    } else if (cmd.includes('function')) {
        cmd = cmd.replace(/(parameter|parameters)/g, '');
        let line = cmd.substring(cmd.indexOf('function') + 9).split(' ');
        let parameters = [];
        if (line[0] == 'named' || line[0] == 'called') line.shift();
        if (line.includes('with')) {
            parameters = line.splice(line.indexOf('with') + 1);
            line.pop();
        }
        makeFunction(toCamel(line.join(' ')), parameters.filter(Boolean));
    } else if (/(constant|variable)/g.test(cmd)) {
        let type, name, value;
        if (cmd.includes('constant')) {
            type = 'const';
            cmd = cmd.replace('variable', '');
        }
        cmd = cmd.replace(/(as|with|named|called)/g, '');
        cmd = cmd.substring(cmd.search(/(variable|constant)/) + 9).split(' ');
        if (cmd.includes('value')) {
            cmd = cmd.join(' ');
            let index = cmd.indexOf('value');
            value = cmd.substring(index + 6);
            cmd = cmd.substring(0, index).split(' ');
        }
        name = toCamel(cmd.filter(Boolean).join(' '));
        makeVariable(type, name, value);
    } else if (/new line/g.test(cmd)) {
        session.insert(editor.getCursorPosition(), '\n');
        giveFeedback("New line created");
    }
}

function commandRead(cmd) {
    if (cmd.includes('this line') || cmd.includes('current line')) {
        let row = editor.getCursorPosition().row;
        let col = getLineLength(row + 1) - 1;
        let Range = ace.require('ace/range').Range;
        if (cmd.includes('exact')) giveFeedback(read(row, row), true);
        else giveFeedback(read(row, row), false);
    } else if (cmd.includes('line')) {
        let row = getLineFromCommand(cmd) - 1;
        goToLine(row + 1);
        let col = getLineLength(row + 1) - 1;
        let Range = ace.require('ace/range').Range;
        if (cmd.includes('exact')) giveFeedback(read(row, row), true);
        else giveFeedback(read(row, row), false);
    } else if (cmd.includes('this block')) {
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

// Goes to specific line (loc 0 = start, loc 1 = end)
function goToLine(lineNum, end = false) {
    editor.gotoLine(lineNum);
    if (end) editor.navigateLineEnd();
}

function getLineFromCommand(cmd) {
    let index = 0;
    if (cmd.length > cmd.indexOf('line') + 4) {
        index = cmd.indexOf('line') + 5;
    }
    let lineNum = parseInt(cmd.substring(index, cmd.length));
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

function goToObject(cmd) {
    if (cmd.includes('checkpoint')) {
        let index = cmd.indexOf('checkpoint');
        cmd = toCamel(cmd.substring(index + 11));
        console.log(cmd);
        loadCheckpoints();
        for (let name of checkpointNames) {
            if (cmd == name) {
                goToCheckpoint('checkpoint', name);
            }
        }
    } else if (cmd.includes('loop')) {
        if (cmd.includes('for')) {
            let line = editor.findNext('for ').startRow;
            let col = editor.findNext('for ').startColumn;
            //TODO
        } else if (cmd.includes('while')) {
            //TODO
        }
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
    let loop = `for (let ${count} = ${start}; ${count} < ${end}; ${count}++) ${blockEnd}`;
    session.insert(editor.getCursorPosition(), loop);
    goToLine(editor.getCursorPosition().row, true);
    giveFeedback("Loop created on line " + currLine());
}

function makeFunction(name, parameters = []) {
    let tabs = editor.getCursorPositionScreen().column / 4;
    let blockEnd = `{\n${'\t'.repeat(tabs + 1)}\n${'\t'.repeat(tabs)}}\n`;
    let func = `function ${name}(${parameters.join(', ')}) ${blockEnd}`;
    session.insert(editor.getCursorPosition(), func);
    goToLine(editor.getCursorPosition().row - 1, true);
    giveFeedback("Function created on line " + currLine());
}

function makeVariable(type = 'let', name = 'x', value) {
    let variable = `${type} ${name} ${(value) ?`= ${value}` : ''};\n`;
    session.insert(editor.getCursorPosition(), variable);
    goToLine(currLine(), true);
    giveFeedback("Variable created on line " + currLine());
}

function makeCheckpoint(type, name, line) {
    let symbol = ' ~ ';
    let comment = '//' + symbol + type + ': "' + name + '"';
    goToLine(line, true);
    session.insert(editor.getCursorPosition(), comment);
    checkpointNames.splice(0, 0, name);
    giveFeedback("Checkpoint created on line " + currLine());
}

function goToCheckpoint(type, name) {
    let allLines = [];
    allLines = aceDoc.getAllLines().slice();
    let symbol = ' ~ ';
    let comment = '//' + symbol + type + ': "' + name + '"';
    for (let i = 0; i < allLines.length; i++) {
        if (allLines[i].includes(comment)) {
            goToLine(i + 2);
            giveFeedback(`Now at ${type} ${name}`);
            return;
        }
    }
    giveFeedback(`Checkpoint ${name} does not exist`);
}
