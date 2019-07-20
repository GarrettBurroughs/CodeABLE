loadCheckpoints();

$('.run-program').click(function () {
    $("#output").empty();
    runProgram(editor.getValue());
});

function runProgram(code) {
    let output;
    let lastLog;
    try {
        // Overwrite console.log during eval() to return console output
        console.oldLog = console.log;
        console.log = (value) => {
            $("#output").append("</p>" + value + "</p>");
        };
        output = eval(code);
        console.log = console.oldLog;
        programSuccess();
    } catch (e) {
        programFail(e);
    }
}

// Keyboard shortcuts
$(document).keydown(function (e) {
    // Click "ESC" to switch between command bar and input
    if (e.which == 27 && $('.form-control').is(':focus') == false) {
        $('.form-control').focus();
        startVoice();
    } else if (e.which == 27) {
        $('.ace_content').focus();
        endVoice();
    }
});

function downloadFile(name) {
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

function commandDisplay(command) {
    command = command.trim();
    command = command.toLowerCase();
    if (command.indexOf(".") >= 0) {
        command = command.substring(0, command.length - 1);
    }
    runCommand(command)
    editor.focus();
    $("#scriptBox").val(command);
    $("#scriptBox")
        .css("color", "#2e9dc6")
        .delay(300)
        .queue(function (next) {
            $(this).css("color", "rgba(255, 255, 255, 0)");
            next();
        })
        .delay(1000)
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
    if (output != undefined) {
        giveFeedback(output);
    }
    giveFeedback("Program ran successfully.");
}

function programFail(error) {
    $("#output").css("color", "red");
    $("#feedbackBar").css("color", "red");
    $("#output").innerHTML += error.message;
    prevError = error;
    giveFeedback(checkError(error));
}
