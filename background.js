//	Metalink Downloader-Chrome Extension
//	Copyright (C) 2012  
//	Developed by :	Sundaram Ananthanarayanan, Anthony Bryan

//	This program is free software: you can redistribute it and/or modify
//	it under the terms of the GNU General Public License as published by
//	the Free Software Foundation, either version 3 of the License, or
//	(at your option) any later version.

//	This program is distributed in the hope that it will be useful,
//	but WITHOUT ANY WARRANTY; without even the implied warranty of
//	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//	GNU General Public License for more details.

//	You should have received a copy of the GNU General Public License
//	along with this program.  If not, see <http://www.gnu.org/licenses/>

//this is the vector of metalinks to be downloaded.
var objects = [];
var workers = [];
var currentIndex=0;
var currentTabURL = "";
const DOWNLOADS_KEY="PREVIOUS_DOWNLOADS";
const PAUSED_DOWNLOADS_KEY="PAUSED_DOWNLOADS";

function initializeObjects()
{
	if(localStorage.getItem(DOWNLOADS_KEY)!=undefined)
		objects=JSON.parse(localStorage.getItem(DOWNLOADS_KEY));
	currentIndex=objects.length;
}
String.prototype.trim = function() {
	return this.replace(/^\s+|\s+$/g,"");
}
function displayParameters(files)
{
	for(i=0;i<files.length;i++)
	{
		var file=files[i];
		console.log(file.size);
		console.log(files[i].fileName);
		for(k=0;k<files[i].urls.length;k++)
			console.log(files[i].urls[k]);
		console.log(file.hash_type);
		console.log(file.hash);
		console.log(file.piece_type);
		console.log(file.piece_length);
		for(k=0;k<files[i].pieces.length;k++)
			console.log(files[i].pieces[k]);
	}
}
function extractContents(contents, type)
{
	var files=new Array();
	if(type=="metalink")
	{
		var x = contents.getElementsByTagName("file");
		for(j=0;j<x.length;j++)
		{
			var file=new Object();
			file.fileName=x[j].getAttribute("name");
			var urls=[];
			for(i=0;i<(x[j].childNodes.length-1)/2;i++)
			{
				var v=x[j].childNodes[i*2+1];
				if(v.localName=="size")
					file.size=v.firstChild.nodeValue;
				if(v.localName=="resources")
					for(k=1;k<v.childNodes.length;k+=2)
						if(v.childNodes[k].localName=="url")
							if(v.childNodes[k].getAttribute("type")=="http")
								urls.push(v.childNodes[k].firstChild.nodeValue.trim());

				if(v.localName=="verification")
					for(k=1;k<v.childNodes.length;k+=2)
					{
						if(v.childNodes[k].localName=="hash")
						{
							file.hash_type	=v.childNodes[k].getAttribute("type");
							file.hash	=v.childNodes[k].firstChild.nodeValue;
						}
						if(v.childNodes[k].localName=="pieces")
						{
							file.piece_type		=v.childNodes[k].getAttribute("type");
							file.piece_length	=v.childNodes[k].getAttribute("length");
							pieces=[];
							var hashes=v.childNodes[k];
							for(l=1;l<hashes.childNodes.length;l+=2)
								pieces.push(hashes.childNodes[l].firstChild.nodeValue);
							file.pieces=pieces;
						}
					}
			}
			file.urls=urls;
			files.push(file);
		}
	}
	else
	if(type=="meta4")
	{
		var x = contents.getElementsByTagName("file");
		for(j=0;j<x.length;j++)
		{
			var file=new Object();
			file.fileName=x[j].getAttribute("name");
			var urls=[];
			for(i=0;i<(x[j].childNodes.length-1)/2;i++)
			{
				var v=x[j].childNodes[i*2+1];
				if(v.localName=="size")
					file.size=v.firstChild.nodeValue;
				if(v.localName=="url")
					urls.push(v.firstChild.nodeValue);
				if(v.localName=="hash")
				{
					file.hash_type	=v.getAttribute("type");
					file.hash	=v.firstChild.nodeValue;
				}
				if(v.localName=="pieces")
				{
					file.piece_type		=v.getAttribute("type");
					file.piece_length	=v.getAttribute("length");
					pieces=[];
					var hashes=v;
					for(l=1;l<hashes.childNodes.length;l+=2)
						pieces.push(hashes.childNodes[l].firstChild.nodeValue);
					file.pieces=pieces;
				}
			}
			file.urls=urls;
			files.push(file);
		}
	}
	//displayParameters(files);
	return files;
}
function getMetalinkFile(url)
{
	try
	{
		var req = new XMLHttpRequest();
		req.overrideMimeType('text/xml');
		req.open("GET",url,false);
		req.send(null);
		if(url.substr(url.length-6)==".meta4")
			type="meta4";
		else
			type="metalink";
		return extractContents(req.responseXML,type);
	}
	catch(e)
	{
		console.log("XHR Error " + e.toString());
		return -1;
	}
}
function Options(type,title,content,icon)
{
	this.type=type;
	this.title=title;
	this.content=content;
	this.icon=icon;
}
/*
function createNotificationInstance(options)
{
	if (options.type == 'simple') {
		return window.webkitNotifications.createNotification(options.icon, options.title, options.content);
	}
	else if (options.type == 'html') {
		return window.webkitNotifications.createHTMLNotification(options.url);
	}
}
*/
function sendNotification(image, title, message, timeout, showOnFocus)
{
	// Default values for optional params
	timeout = (typeof timeout !== 'undefined') ? timeout : 0;
	showOnFocus = (typeof showOnFocus !== 'undefined') ? showOnFocus : true;

	// Check if the browser window is focused
	var isWindowFocused = document.querySelector(":focus") === null ? false : true;
  
	// Check if we should send the notification based on the showOnFocus parameter
	var shouldNotify = !isWindowFocused || isWindowFocused && showOnFocus;
  
	if (window.webkitNotifications && shouldNotify) 
	{
		// Create the notification object
		var notification = window.webkitNotifications.createNotification(image, title, message);
	    
		// Display the notification
		notification.show();
	    
		if (timeout > 0) {setTimeout(function(){notification.cancel()}, timeout);}
	}
};
function printCurrentDownloads(array)
{
	for(i=0;i<array.length;i++)
		console.log(array[i]);
	return;
}
/*
chrome.tabs.onUpdated.addListener
(
	function(tabId,changeInfo,tab){
		currentTabURL=tab.url;
	}
);
chrome.tabs.onActivated.addListener
(
	function(activeInfo){
		chrome.tabs.get(
			activeInfo.tabId,
			function(tab)	{	currentTabURL=tab.url;}
		);
	}
);
*/
/*
function savePausedItem(file,completedPackets)
{
	array=JSON.parse(localStorage.getItem(PAUSED_DOWNLOADS_KEY));
	if(array==undefined)
		array=new Array;
	object=new Object();
	object.file=file;
	object.completedPackets=completedPackets;
	array.push(object);
}
*/
function saveItem(object)
{
	array=JSON.parse(localStorage.getItem(DOWNLOADS_KEY));
	if(array==undefined)
		array=new Array;
	array.push(object);
	localStorage.setItem(DOWNLOADS_KEY,JSON.stringify(array));
}
function getDownloadMessage(url)
{
	return 'The Metalink is being downloaded by the Extension. Click on the extension icon to track the progress of the download.';
}
function resumeDownload(index)
{
	object=objects[index];
	object.status='Downloading';
	worker = new Worker('downloader.js');
	workers[index]=worker;
	object.file.finishedPackets=object.finishedPackets;
	worker.postMessage({'cmd': 'START', 'url': JSON.stringify(object.file)});
	worker.addEventListener('message',
			function(e)
			{
				data = e.data;
				switch(data.cmd)
				{
					case 'DOWNLOADING':
						if(data.value>object.percent)
							object.percent=(data.value).toFixed(2);
						//console.log(object.percent);
						object.status='Downloading';
						break;
					case 'LOG':
						console.log(data.value);break;
					case 'COMPLETE':
						console.log('File Download Completed');
						object.status='Completed';
						object.percent=100;
						saveItem(object);
						break;
					case 'SAVE':
						console.log('save requested from '+data.value);
						chrome.experimental.downloads.download({url: data.value,saveAs:true},function(id) {});
						break;
					case 'FAILED':
						object.status='Failed';
						object.percent=0;
						console.log('Download of the file Failed');
						worker.terminate();
						break;
					case 'VERIFICATION':
						object.status='Verifying';
						object.percent=100;
						console.log('Verification Initiated');
						break;
					case 'SIZE':
						object.size=data.value;
						break;
					case 'RESTART':
						object.percent=0;
						object.status="Restarting"
						console.log('Restarting Download');
						break;
					case 'PAUSEDSTATE':
						object.status="Paused";
						object.finishedPackets=JSON.parse(data.value);
						object.finishedPackets.sort();
						break;
					default:
						console.log(data.cmd);
				};

			}, false);
}
function startDownload(url)
{
	files=getMetalinkFile(url);
	if(files==-1)
		return;
	//sendNotification('http://metalinker.org/images/favicon.ico', 'Download Initiated', getDownloadMessage(fileName), 10000, true);
	for(i=0;i<files.length;i++)
	{
		var currentFileIndex=currentIndex;
		currentIndex++;
		worker = new Worker('downloader.js');
		workers[currentFileIndex]=worker;
		worker.postMessage({'cmd': 'START', 'url': JSON.stringify(files[i])});
		var object=new Object();
		object.file=files[i];
		
		if(files[i].size)
			object.size=files[i].size;
		else
			object.size="Unknown";
		object.clear=false;
		object.status='Downloading';	object.percent=0;
		object.fileName=files[i].fileName;
		objects[currentFileIndex]=object;
		worker.addEventListener('message',
			function(e)
			{
				data = e.data;
				switch(data.cmd)
				{
					case 'DOWNLOADING':
						if(data.value>object.percent)
							object.percent=(data.value).toFixed(2);
						//console.log(object.percent);
						object.status='Downloading';
						break;
					case 'LOG':
						console.log(data.value);break;
					case 'COMPLETE':
						console.log('File Download Completed');
						object.status='Completed';
						object.percent=100;
						saveItem(object);
						break;
					case 'SAVE':
						console.log('save requested from '+data.value);
						chrome.experimental.downloads.download({url: data.value,saveAs:true},function(id) {});
						break;
					case 'FAILED':
						object.status='Failed';
						object.percent=0;
						console.log('Download of the file Failed');
						worker.terminate();
						break;
					case 'VERIFICATION':
						object.status='Verifying';
						object.percent=100;
						console.log('Verification Initiated');
						break;
					case 'SIZE':
						object.size=data.value;
						break;
					case 'RESTART':
						object.percent=0;
						object.status="Restarting"
						console.log('Restarting Download');
						break;
					case 'PAUSEDSTATE':
						object.status="Paused";
						object.finishedPackets=JSON.parse(data.value);
						object.finishedPackets.sort();
						break;
					default:
						console.log(data.cmd);
				};

			}, false);
	}
}
initializeObjects();
chrome.webRequest.onBeforeRequest.addListener
(
	function(info)
	{
		fileName=info.url;
		startDownload(fileName);
		return { redirectUrl: "about:blank" }
	},
	{
    		urls: ["http://*/*.metalink","http://*/*.meta4","https://*/*.metalink","https://*/*.meta4"]
	},
  	["blocking"]
);
chrome.extension.onRequest.addListener
(
	function(info, sender, callback) 
	{
		switch(info.cmd)
		{
			case 'DOWNLOAD'	:fileName=info.url;
					startDownload(fileName);
					break;

			case 'PAUSE'	:if(objects[info.data].status=='Downloading')
						workers[info.data].postMessage({'cmd':'PAUSE'});
					break;
			case 'RESUME'	:resumeDownload(info.data);
					break;
		};
 	}
);
