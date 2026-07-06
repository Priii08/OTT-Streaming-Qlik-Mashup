/*
 * Basic responsive mashup template
 * @owner Enter you name here (xxx)
 */
/*
 *    Fill in host and port for Qlik engine
 */
var prefix = window.location.pathname.substr( 0, window.location.pathname.toLowerCase().lastIndexOf( "/extensions" ) + 1 );
var config = {
	host: window.location.hostname,
	prefix: prefix,
	port: window.location.port,
	isSecure: window.location.protocol === "https:"
};
require.config( {
	baseUrl: ( config.isSecure ? "https://" : "http://" ) + config.host + (config.port ? ":" + config.port : "") + config.prefix + "resources"
} );

require( ["js/qlik"], function ( qlik ) {
	qlik.on( "error", function ( error ) {
		$( '#popupText' ).append( error.message + "<br>" );
		$( '#popup' ).fadeIn( 1000 );
	} );
	$( "#closePopup" ).click( function () {
		$( '#popup' ).hide();
	} );

	//callbacks -- inserted here --
	//open apps -- inserted here --
	var app = qlik.openApp('OTT Streaming Analytics Dashboard.qvf', config);

	//get objects -- inserted here --
	app.getObject('contentPlatform','RfuHLp');
	app.getObject('releaseTrend','GpBrj');
	app.getObject('genreTreemap','GwpLDF');
	app.getObject('topCountries','BWpAC');
	app.getObject('imdbScatter','xzVsC');
	app.getObject('growthChart','eLPjFK');
	
	//create cubes and lists -- inserted here --
	app.getObject('totalTitles','frUmCL');
	app.getObject('totalCountries','ZcYMMjQ');
	app.getObject('avgIMDb','pnjwYfz');
	app.getObject('avgRuntime','Fhvbt');
	
	app.getObject('platformFilter','mwEzrF');
	app.getObject('releaseYearFilter','GktacPt');
	app.getObject('ageRatingFilter','jLUSJg');
	app.getObject('countryFilter','MJmLkr');
	
	const toggleBtn = document.getElementById("themeToggle");

toggleBtn.addEventListener("click",()=>{

document.body.classList.toggle("dark");

});

} );

// =============================
// Theme Toggle
// =============================