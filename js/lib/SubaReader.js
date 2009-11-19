/**
 * @fileOverview    Classes for reading data from the Suba database
 */

if ( typeof MASCP == 'undefined' || typeof MASCP.Service == 'undefined' ) {
    throw "MASCP.Service is not defined, required class";
}


/** Default class constructor
 *  @class      Service class that will retrieve data from SUBA for a given AGI.
 *              Data is transferred using JSON.
 *  @param      {String} agi            Agi to look up
 *  @param      {String} endpointURL    Endpoint URL for this service
 *  @extends    MASCP.Service
 */
MASCP.SubaReader = MASCP.buildService(function(data) {
                        jQuery.extend(this,MASCP.SUBA_FIELDS);

                        for (var result_field in MASCP.SUBA_FIELDS) {
                            if (data && data.rows && data.rows.length > 0) {
                                this[result_field] = data.rows[0][result_field];
                            }
                        }
                        return this;
                    });

MASCP.SubaReader.prototype.requestData = function()
{
    var data = [{'type':'condition','sql':{'column':'locus','operator':'in','value':this.agi}}];
    return {
        type: "POST",
        dataType: "json",
        data: { 'where' : data.toJSON ? data.toJSON() : JSON.stringify(data),
                'sort'  : 'locus',
                'start' : '0',
                'limit' : '50',
                'dir'   : 'ASC',
                'db'    : 'suba',
                'action': 'db_filter',
                'table' : 'suba2',
                'service' : 'suba' 
        }
    };
};

/**
 *  @class   Container class for results from the Promex service
 *  @extends MASCP.Service.Result
 */
// We need this line for the JsDoc to pick up this class
MASCP.SubaReader.Result = MASCP.SubaReader.Result;

/**#@+
 * @memberOf MASCP.SubaReader.Result.prototype
 */
MASCP.SUBA_FIELDS =
{
    /** @name location_gfp */
    location_gfp        :   null,
    /** @name location_ipsort */
    location_ipsort     :   null,
    /** @name location_loctree */
    location_loctree    :   null,
    /** @name location_mitopred */
    location_mitopred   :   null,
    /** @name location_mitoprot2 */
    location_mitoprot2  :   null,
    /** @name location_ms */
    location_ms         :   null,
    /** @name location_multiloc */
    location_multiloc   :   null,
    /** @name location_preoxp */
    location_preoxp     :   null,
    /** @name location_predotar */
    location_predotar   :   null,
    /** @name location_subloc */
    location_subloc     :   null,
    /** @name location_swissprot */
    location_swissprot  :   null,
    /** @name location_targetp */
    location_targetp    :   null,
    /** @name location_wolfpsort */
    location_wolfpsort  :   null
};

/**#@-*/

MASCP.SubaReader.Result.prototype._parseLocalisation = function(localisation)
{
    if (localisation == null || localisation.length == 0 )
    {
        return null;
    }
    var experiments = localisation.split(';');
    var tissues = {}
    for (var i = 0; i < experiments.length; i++) {
        var data = experiments[i].split(':');
        tissues[data[0]] = tissues[data[0]] || [];
        tissues[data[0]].push(data[1]);
    }
    return tissues;
};

MASCP.SubaReader.Result.prototype._sortLocalisation = function(loc_data)
{
    var loc_keys = [];
    for (var i in loc_data) {
        loc_keys.push(i);
    }
    
    loc_keys = loc_keys.sort(function(a,b) {
        return loc_data[a].length - loc_data[b].length;
    });
    
    return loc_keys;    
};

/** Retrieve the mass spec localisation for this AGI
 *  @returns [ { String : [String] } ]   Mass Spec localisation and array of Pubmed IDs
 */
MASCP.SubaReader.Result.prototype.getMassSpecLocalisation = function()
{
    return this._parseLocalisation(this.location_ms);
};


/** Retrieve the GFP localisation for this AGI
 *  @returns [ {String : [String] }  ]   GFP localisation and array of Pubmed IDs
 */
MASCP.SubaReader.Result.prototype.getGfpLocalisation = function()
{
    return this._parseLocalisation(this.location_gfp);
};

MASCP.SubaReader.Result.prototype.mapController = function(inputElement)
{
    if ( ! this._map ) {
        return null;
    }
    var map = this._map;
    inputElement = inputElement ? jQuery(inputElement) : jQuery('<div><div class="ms"><input class="ms" type="checkbox"/> MS</div><div class="gfp"><input class="gfp" type="checkbox"/> GFP</div></div>');
    
    if ( ! this.getMassSpecLocalisation() )  {
        jQuery('div.ms', inputElement).css({ 'display': 'none' });
    } else {
        var ms_loc = this._sortLocalisation(this.getMassSpecLocalisation());
        jQuery('input.ms', inputElement).bind('change', function() {
            if (this.value) {
                for (var i in ms_loc) {
                    map.showKeyword(ms_loc[i], '#ff0000');
                }                            
            } else {
                for (var i in ms_loc) {
                    map.hideKeyword(ms_loc[i], '#ff0000');
                }                
            }
        }).attr('checked', true);
    }
    if ( ! this.getGfpLocalisation() )  {
        jQuery('div.gfp', inputElement).css({ 'display': 'none' });
    } else {
        var gfp_loc = this._sortLocalisation(this.getGfpLocalisation());
        jQuery('input.gfp', inputElement).bind('change', function() {
            if (this.value) {
                for (var i in gfp_loc) {
                    map.showKeyword(gfp_loc[i], '#00ff00');
                }                            
            } else {
                for (var i in gfp_loc) {
                    map.hideKeyword(gfp_loc[i], '#00ff00');
                }                
            }
        }).attr('checked', true);
    }

    return inputElement[0];
};

MASCP.SubaReader.Result.prototype.render = function()
{
    var ms_loc = this._sortLocalisation(this.getMassSpecLocalisation());
    var gfp_loc = this._sortLocalisation(this.getGfpLocalisation());
    var container = jQuery('<div><a style="display: block; float: right;" href="http://www.plantenergy.uwa.edu.au/applications/suba/flatfile.php?id='+this.reader.agi+'">SUBA</a></div>')
    if ( ms_loc.length == 0 && gfp_loc.length == 0 ) {
        return jQuery('<div>No data</div>');
    }
    if (ms_loc.length > 0) {
        container.append('<div>Proteomics: '+ms_loc.join(', ')+'</div>');
    }
    if (gfp_loc.length > 0) {
        container.append('<div>Flourescent Protein: '+gfp_loc.join(', ')+'</div>');
    }
    
    var do_diagrams = (window.location.search.replace(/^\?/, '').indexOf('drawMap') >= 0);
    
    if (typeof GOMap != 'undefined' && do_diagrams) {
        container.text('');
        var map = new GOMap.Diagram('cell.svg');
        var map_container = jQuery('<div style="position: relative; height: 0px; width: 100%; margin-bottom: 2px; overflow: hidden;"></div>');
        jQuery(map).bind('onload', function() {
            for (var i in ms_loc) {
                map.showKeyword(ms_loc[i]);
            }            
            for (var i in gfp_loc) {
                map.showKeyword(gfp_loc[i],'#00ff00');
            }
            map_container.css({'height': '100%','overflow':'visible'});
            map.makeDraggable();
        });
        container.append(map_container);
        map.appendTo(map_container[0]);
        container.append('<div style="height: 0px; width: 100%; clear: both; float: none;"></div>');
        this._map = map;
    }
    return container;
};