var fs = require('fs');
if (!fs.existsSync('./api-credentials.js')){
      console.log('Add your credentials to a copy of api-credentials.js.default and rename to api-credentials.js');
      process.exit()
  }

var json2csv = require('json2csv');
var EdgeGrid = require('edgegrid');
var apicredentials = require('./api-credentials');

    
    
var client_token = apicredentials.config.client_token,
client_secret = apicredentials.config.client_secret,
access_token = apicredentials.config.access_token,
base_uri = apicredentials.config.base_uri
 
    
var eg = new EdgeGrid(client_token, client_secret, access_token, base_uri);
var request_body = {"policyManagerRequest":{"command":"getPolicyInfoMapUsingACGIDs","getPolicyInfoMapUsingACGIDs":{}}};
eg.auth({
  "path": "config-edgeredirector-data/api/v1/policymanager",
  "method": "POST",
  "headers": {},
  "body": "query=" + encodeURIComponent(JSON.stringify(request_body))
});
eg.send(function (data, response) {
  data = JSON.parse(data);
  if(data.responseCode === 0){
    getPolicyDetails(data.response);
  }
  else{
    console.log("Error reading policies : " + data.status + ':' + data.title);
    console.log("Error Detail : " + data.detail);
  }
});



function getPolicyDetails(policy_ids){
  console.log('Number of policies:' + policy_ids.length);
	for (var i = policy_ids.length -1; i >= 0; i--) {
		var request_body = {"policyManagerRequest": {"command": "read","read": {"id": policy_ids[i].id }}};
    eg.auth({
      "path": "config-edgeredirector-data/api/v1/policymanager",
      "method": "POST",
      "headers": {},
      "body": "query=" + encodeURIComponent(JSON.stringify(request_body))
    });
    eg.send(function (data, response) {

      data = JSON.parse(data);
      if(data.responseCode === 0){
        var match_rules = data.response.matchRules;
        
        var match_array = [];
        for (var i = 0; i < match_rules.length; i++) {
          for (var j = 0; j < match_rules[i].matches.length; j++) {
            var flattened_rule = {};
            flattened_rule.cloudlet_type = data.response.cloudletConfig.name;
            flattened_rule.policy_name = data.response.policyName;
            flattened_rule.version = data.response.version;
            flattened_rule.description = data.response.description;          
            flattened_rule.rule_group = i + 1;
            flattened_rule.matchValue = match_rules[i].matches[j].matchValue;
            flattened_rule.caseSensitive = match_rules[i].matches[j].caseSensitive;
            flattened_rule.matchOperator = match_rules[i].matches[j].matchOperator; 
            flattened_rule.matchType = match_rules[i].matches[j].matchType;
            flattened_rule.negate =  match_rules[i].matches[j].negate;    
            flattened_rule.redirectURL =  match_rules[i].redirectURL;

            match_array.push(flattened_rule);
          }
        }
      }
      else {
        console.log('Error reading policy ' + policy_ids[i].id);
        console.log("Error : " + data.status + ':' + data.title);
        console.log("Error Detail" + data.detail);
      }
      export_file (data.response.policyName, match_array)
  	});
	};	
}

function export_file(file_name, match_array){

  var export_dir = './exports';
  if (!fs.existsSync(export_dir)){
      fs.mkdirSync(export_dir);
  }

  var fields = ['cloudlet_type','policy_name','version','description','name','rule_group','caseSensitive','matchType','negate','matchOperator','matchValue','redirectURL'];
    json2csv({ data: match_array, fields: fields }, function(err, csv) {
      if (err) console.log(err);
        fs.writeFile(export_dir + '/' + file_name +'.csv', csv, function(err) {
      if (err) throw err;
        console.log('Writing file: ' + file_name);
      });
    });
}