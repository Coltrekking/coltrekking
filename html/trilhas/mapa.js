setTimeout(() =>
{
    let center = sessionStorage.getItem('center')

    center = center == null ? [-19.9155966, -43.9822332] : JSON.parse(center)

    /* MAP */
    let map = L.map('map').setView(center, 15)

    /* LAYERS */

    let g_terrain = L.tileLayer('http://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    {
        maxZoom: 20,
        subdomains:['mt0','mt1','mt2','mt3']
    });

    /* CHOOSING LAYER */
    g_terrain.addTo(map);

    let user_figures = sessionStorage.getItem('figures')

    if(user_figures == null)
    {
        user_figures = new L.FeatureGroup()
    }
    else
    {
        user_figures = L.geoJSON(JSON.parse(user_figures))
    }
    
    if(sessionStorage.getItem('edit') == 'true')
    {
        let draw_ctrl = new L.Control.Draw
        ({
            edit:
            {
                featureGroup: user_figures
            }
        })

        map.addControl(draw_ctrl)
        document.getElementById('btn_save').style.display = 'inline'
    }

    map.addLayer(user_figures)
    map.on('draw:created', e => user_figures.addLayer(e.layer))

    document.getElementById('btn_save').addEventListener('click', e =>
        {
            sessionStorage.setItem('figures', JSON.stringify(user_figures.toGeoJSON()))
            sessionStorage.setItem('center', JSON.stringify(map.getCenter()))
        })

}, 1000)
