loadCheckpoints();

function runProgram() {
    $("#output").empty();
    try {
        let output = [];
        // Overwrite console.log during eval() to return console output
        console.oldLog = console.log;
        console.log = (value) => {
            output.push(value);
        };
        eval(editor.getValue());
        console.log = console.oldLog;
        programSuccess(output);
    } catch (e) {
        programFail(e);
    }
}

// Keyboard shortcuts
let keyLogger = {};
onkeydown = onkeyup = function(e){
    e = e || event;
    let cmd = window.navigator.platform.match("Mac") ? keyLogger[91] : keyLogger[17];
    keyLogger[e.keyCode] = e.type == 'keydown';
    // Click ESC to switch between command bar and input
    if (keyLogger[27]) {
        if (!$('.form-control').is(':focus')) {
            $('.form-control').focus();
            startVoice();
        } else {
            editor.focus();
            endVoice();
        }
    }
    // Click CMD/CTRL + "Enter" to run program
    if (cmd && keyLogger[82]) {
        runProgram();
    }
    // Click CMD/CTRL + "Enter" to run program
    if (cmd && keyLogger[83]) {
        e.preventDefault();
        downloadFile();
    }
}

function downloadFile(name = 'script') {
    let file = new File([editor.getValue()], name + ".js", {
        type: "text/plain;charset=utf-8"
    });
    saveAs(file);
}

function openFile() {

}

function feedbackDisplay(feedback) {
    if (feedback != undefined) {
        $("#feedbackBar").text(feedback);
        $("#feedbackBar").fadeIn(500).delay(feedback.length * 200).fadeOut(500);
    }
}

// Neaten user's given voice command and replace common detection mistakes
function cleanCommand(command) {
    command = command.trim().toLowerCase();
    // Remove any period at end of command from auto-voice
    if (command.indexOf('.') == command.length - 1) {
        command = command.substring(0, command.length - 1);
    }
    command = command
        .replace(/:00/g, '')
        .replace(/\\?/g, '')
        .replace(/zero/g, '0')
        .replace(/(for|4) (luke|loop)/g, 'for loop')
        .replace(/jay/g, 'j')
        .replace(/(parameter|parameters) (at|and|an)/g, 'parameters n');
    return command;
}

function commandDisplay(command) {
    // Create array of commands by splitting with 'and' keyword
    command = cleanCommand(command).split(' and ');
    console.log(command);
    for (let i = 0; i < command.length; i++) {
        runCommand(command[i]);
    }
    editor.focus();
    $("#scriptBox").val(command.join(' and '));
    $("#scriptBox")
        .css("color", "#2e9dc6")
        .delay(150)
        .queue(function (next) {
            $(this).css("color", "rgba(255, 255, 255, 0)");
            next();
        })
        .delay(500)
        .queue(function (next) {
            $(this).val("");
            $(this).css("color", "white");
            next();
        })
}

function commandEntered(e) {
    if (e.keyCode == 13) {
        $(".form-control").blur();
        if ($("#scriptBox").val() != undefined) {
            commandDisplay($("#scriptBox").val());
        }
        return false;
    }
}

function programSuccess(output) {
    $("#output").css("color", "white");
    $("#feedbackBar").css("color", "white");
    giveFeedback("Program ran successfully.");
    if (output.length > 0) {
        giveFeedback("Console output: ")
        for (let line of output) {
            $("#output").append("</p>" + line + "</p>");
        }
        giveFeedback(output);
    }
}

function programFail(error) {
    $("#output").css("color", "red");
    $("#feedbackBar").css("color", "red");
    $("#output").append("</p>" + checkError(error) + "</p>");
    giveFeedback(checkError(error));
}
