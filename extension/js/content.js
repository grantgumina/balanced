// chrome.extension.onMessage.addListener(function(response, sender, sendResponse) {
//     var url = response.url;
//     var encodedUrl = encodeURIComponent(url);
//
//     // Ask server for related stories
//     var xhr = new XMLHttpRequest();
//
//     xhr.open("GET", "http://localhost:3000/event/" + encodedUrl, true);
//
//     xhr.onreadystatechange = function() {
//         if (xhr.readyState == 4) {
//             if (xhr.status == 200) {
//                 var result = xhr.responseText;
//                 var json = JSON.parse(result);
//             }
//         }
//     };
//
//     xhr.send();
// });
