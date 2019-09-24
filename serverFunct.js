const {exec} = require('child_process');
var app = require('express')();
var http = require('http').createServer(app);
var serverIo = require('socket.io')(http);
var clientIo = require('socket.io-client');
var publicIp = require("public-ip");
const fs = require('fs');


var serverPort = 3001;
var ClientPort = 3002;
var buffer     = undefined;
var ip         = undefined;
var ip4        = undefined;
var ip6        = undefined;
var mode       = undefined;

//mode definition
//  0-> provider
//  1-> validator

//test declarations//////////////////////
mode = 0;
fs.readFile('image.zip' , (err, data)=>{
    buffer = data;
});
////////////////////////////////////////

///////////////////////////////////////////////////////////////////Get IP///////////////////////////////////////////////////////////////////////////////////
var getIp = (async() => {
    await publicIp.v4().then(val => {ip4 = val});
    await publicIp.v6().then(val => {ip6 = val});
})
  
  //this calls the IP generating file and then depending on the option that is given it will create the server
  //since the IP is necessary for the creation of the socket.io server all the server section resides in this .then call
getIp().then(() => {
    //allow for manual choice (defaults to IPv4)
    if(process.argv[2] !== undefined && process.argv[2] === "-def" && process.argv[3] !== undefined ){
        ip = process.argv[3] + ":" + serverPort;
    }
    else if(process.argv[2] !== undefined && process.argv[2] === "-4"){
      ip = ip4 + ":" + serverPort;
    }
    else if(process.argv[2] !== undefined && process.argv[2] === "-6"){
      ip = "[" + ip6 + "]:" + serverPort;
    }
    else{
      ip = ip4 + ":3001";
    }
    console.log(ip);
});

///////////////////////////////////////////////////////////////////server///////////////////////////////////////////////////////////////////////////////////
serverIo.on('connection', function(socket){

    //this is sent by another computer to recieve the current file
    //(ex. the provider will send request to the user for the data)
    //there are different calls the two connections to ensure that the
    //data is received
    socket.on('request', () =>{
        console.log("Got:request from:" + socket);
        if(buffer !== undefined){
            socket.emit('transmitting', buffer);
            console.log("emit:transmitting" );
        }
        else{
        console.log("NO FILE FOUND!! Something seriously wrong has happened. The environment does not have the result saved for some reason.");
        }
    });

    if(buffer === undefined){
        socket.emit('request');
    }
    
    //this is called when a server send data in responce to this current computer's request
    socket.on('transmitting', ( data )=>{
        console.log("Got data: " + data)
        if(data !== undefined){                     
            clientSocket.disconnect(true);
            writeFile(data);
        }
        else{
            socket.emit('request');
        }
    });
    
});

//creates the server
http.listen(serverPort , function(){
    console.log('listening on: ' + serverPort);
});


//function to write a file
//this is a helper function for request
function writeFile(data){
    fs.writeFile("image.zip", data, (err) => {
        if(err){
            //writeFile(data) ///might cause an infinite loop, probably should just wait
            console.log('corrupted file')
            return;
        }
        else {
            execute();
        }
    });
}
//execute the python code 
//this is a helper function for request and a call back for writeFile
//this should only be called by write file
function execute(){
    exec('python3 execute.py ' + mode , (err,stdout,stderr)=>{
        if(err){
          console.log(err);
          return;
        }
        console.log(stdout);
      });
}
//function to request from another ip address
//(the ip will be either the dataId or requestId)
//it needs to create a client socketIo instance
function request(reqIp){
    //create a client connection
    var clientSocket = clientIo.connect("http://" + reqIp + "/");
    
    //emit the request
    clientSocket.emit('request');

    //this is called when a server send data in responce to this current computer's request
    clientSocket.on('transmitting', ( data )=>{
        console.log("Got data: " + data)
        if(data !== undefined){                     
            clientSocket.disconnect(true);
            writeFile(data);
        }
        else{
            socket.emit('request');
        }
    });
}

