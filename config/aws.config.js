var AWS = require('aws-sdk');

// Insert your AWS credentials
var AWS_ACCESS_KEY_ID = '';
var AWS_SECRET_ACCESS_KEY = ''; 
var AWS_REGION = ''; // ie: 'us-west-2`
var BASE_URL = ''; // ie: 'https://s3-us-west-1.amazonaws.com/path/to/file/'

AWS.config.update({
	accessKeyId: AWS_ACCESS_KEY_ID, 
	secretAccessKey: AWS_SECRET_ACCESS_KEY,
	region: AWS_REGION
});

AWS.config.baseUrl = BASE_URL;

module.exports = AWS;