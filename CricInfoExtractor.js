//The Purpose of this project is to  extract information from internet of WorldCup 2019 from cicinfo and present it
//In the form of excel and Pdf scorecards
//The real purpose of this project  is to learn how to extract information from internet and get experiance eith js
//A very good reason to ever make this project to have good fun

//----------------------------from npm modules i need these lib--------------------------------------------------------------

//                                     npm init -y
//                                 npm install minimist
//                                 npm install axios
//                                 npm install jdom
//                                 npm install excel4node
//                                 npm install pdf-lib

// --------------------------------------------------------------------------------------------------------------------------                             
// how to run this project-->node CricInfoExtractor.js --excel=Worldcup.csv --dataFolder=data --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results
// --------------------------------------------------------------
// node CricInfoExtractor.js --source=? --dataFolder=data --excel=Worldcup.csv
//------------------------------------------------------------

// requiring All modules so that we can use it in the project

let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel= require("excel4node");
let pdf = require("pdf-lib");
let fs=require("fs");
let path =require("path");

//--------------------------------------------------------------------------------------------------------------------------
//                              <~~~~~~~~~~~~WORK TO BE DONE~~~~~~~~~~~~~~~~~>

//                              1. Downloding the data from inter using axios
//                              2. Read the html data using jsdom
//                              3. Make the Excel sheet of the fetched data using excel4node
//                              4. make the pdf of the excel from the pdf

// --------------------------------------------------------------------------------------------------------------------------

//                                    ****************       START      ****************

let args = minimist(process.argv); //taking input from console using minimist lib, now all the input is stored in args as reference
//console.log(args);
let responseKaPromise = axios.get(args.source);//in this axios is using get() method and giving promise that axios will retrieve data from (args.sourse)

//responseKaPromise.then(function(){}).catch(function(){});  ---> this is the line of code which will run when axios fullfill its promice

responseKaPromise.then(function (response) {// System will tell like when you complete the promice just give response to the function so that i can do further work
    let html = response.data;//here html is holding the response which came from internet 
    //console.log(html) ; //checking what we got

    let dom = new jsdom.JSDOM(html);//it will create dom object . loding of html is done in this jsdom.JSDOM(html) .  jsdom will convert html in document model 
    let document = dom.window.document;

    let matches = [];
    let matchScoreDivs = document.querySelectorAll("div.match-score-block");
    for (let i = 0; i < matchScoreDivs.length; i++) {
        let match = {

        };

        let name = matchScoreDivs[i].querySelectorAll("p.name");
        match.team1_name = name[0].textContent;
        match.team2_name = name[1].textContent;

        let score = matchScoreDivs[i].querySelectorAll("div.score-detail >span.score");
        if (score.length == 2) {
            match.t1Score = score[0].textContent;
            match.t2Score = score[1].textContent;
        }
        else if (score.length == 1) {
            match.t1Score = score[0].textContent;
            match.t2Score = "";
        }
        else {
            match.t1Score = "";
            match.t2Score = "";
        }

        let result = matchScoreDivs[i].querySelector("div.status-text > span");
        match.Result=result.textContent;
        // let numb= matchScoreDivs[i].querySelector("div.description < a");
        // match.Which_match_no=numb;
        matches.push(match);
        //console.log(i);
    }

   // console.log(matches);
    let matchJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json",matchJSON,"utf-8");

    let teams =[];
    
    for(let i =0 ;i<matches.length;i++){
        populateTeams(teams,matches[i]);// put team in team array if it is not there in teams array

    }
    for(let i=0;i<matches.length;i++){
        populateMatchesInAppropriateTeams(teams,matches[i]);
    }

    let teamsJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json",teamsJSON,"utf-8");
    //console.log(teamsJSON);
    createExcelFIle(teams);
    createFolders(teams);

}).catch(function (err) {
    console.log(err);
});

function createFolders(teams){
    fs.mkdirSync(args.dataFolder);
    for(let i =0;i < teams.length;i++){
        let teamFolder = path.join(args.dataFolder , teams[i].name );
        fs.mkdirSync(teamFolder);
        for(let j = 0 ; j< teams[i].matchesPlayed.length ; j++){
            let matchFileName = path.join(teamFolder,teams[i].matchesPlayed[j].vs +".pdf");
            createScoreCard(teams[i].name,teams[i].matchesPlayed[j] , matchFileName);
        }
    }
}

function createScoreCard(teamName, match, matchFileName) {
    let t1 = teamName;
    let t2 = match.vs;
    let t1s = match.selfScore;
    let t2s = match.oppScore;
    let result = match.result;

    let bytesOfPDFTemplate = fs.readFileSync("Template.pdf");

    let pdfdocKaPromise = pdf.PDFDocument.load(bytesOfPDFTemplate);
    pdfdocKaPromise.then(function(pdfdoc){
        let page = pdfdoc.getPage(0);

        page.drawText(t1, {
            x: 320,
            y: 729,
            size: 8
        });
        page.drawText(t2, {
            x: 320,
            y: 715,
            size: 8
        });
        page.drawText(t1s, {
            x: 320,
            y: 701,
            size: 8
        });
        page.drawText(t2s, {
            x: 320,
            y: 687,
            size: 8
        });
        page.drawText(result, {
            x: 320,
            y: 673,
            size: 8
        });

        let finalPDFBytesKaPromise = pdfdoc.save();
        finalPDFBytesKaPromise.then(function(finalPDFBytes){
            fs.writeFileSync(matchFileName, finalPDFBytes);
        })
    })
}

function createExcelFIle(teams){
    let wb =new excel.Workbook();
    for(let i=0;i<teams.length;i++){
        let sheet = wb.addWorksheet(teams[i].name);
        sheet.cell(1,1).string("verses");
        sheet.cell(1,2).string("self score");
        sheet.cell(1,3).string("Opposition Score");
        sheet.cell(1,4).string("Result");
        for (let j=0 ; j < teams[i].matchesPlayed.length; j++) {
            sheet.cell(2 + j, 1).string(teams[i].matchesPlayed[j].vs);
            sheet.cell(2 + j, 2).string(teams[i].matchesPlayed[j].selfScore);
            sheet.cell(2 + j, 3).string(teams[i].matchesPlayed[j].oppScore);
            sheet.cell(2 + j, 4).string(teams[i].matchesPlayed[j].result);
        }
        // for(let j = 0 ; j <teams.matches.length ; j++){
        //     sheet.cell(j+3,1).string(teams[i].matches[j].selfScore);
        //     sheet.cell(j+3,1).string(teams[i].matches[j].oppScore);
        //     sheet.cell(j+3,1).string(teams[i].matches[j].result);
        // }
    }
    wb.write(args.excel);
}

function populateTeams(teams,match){
    // let t1idx = teams.findIndex(function(team){// eg find index of india findIndex(function(india) which is there in math where to fing in teams
    //     if(team.name == match.team1_name){
    //         return true;
    //     }
    //     else{
    //         return false;
    //     }
    // });
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.team1_name) {
            t1idx = i;
            break;
        }
    }
    // if(t1idx==-1){
    //     let team={
    //         name:match.team1_name,
    //         matches:[]
    //     };
    //     teams.push(team);
    // }
    if(t1idx==-1){
        teams.push({
            name:match.team1_name,
            matchesPlayed: []
        });
    }
    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.team2_name) {
            t2idx = i;
            break;
        }
    }

    if (t2idx == -1) {
        teams.push({
            name: match.team2_name,
            matchesPlayed: []
        });
    }
}
function populateMatchesInAppropriateTeams(teams,match){
    let t1idx = -1;
    for(let i=0;i<teams.length;i++){
        if(teams[i].name==match.team1_name){
            t1idx=i;
            break;
        }
    }
    let team1=teams[t1idx];
    team1.matchesPlayed.push({
        vs : match.team2_name,
        selfScore : match.t1Score,
        oppScore : match.t2Score,
        result : match.Result
    });

    let t2idx = -1;
    for(let i = 0;i<teams.length;i++){
        if(teams[i].name==match.team2_name){
            t2idx=i;
            break;
        }
    }
     let team2=teams[t2idx];
    //console.log(teams[t2idx]);
    team2.matchesPlayed.push({
        vs : match.team1_name,
        selfScore:match.t2Score,
        oppScore:match.t1Score,
        result:match.Result
    });

}