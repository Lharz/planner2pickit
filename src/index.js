const {app, BrowserWindow} = require('electron')
const path = require('path')
const url = require('url')
const net = require('electron').net
const loadJsonFile = require('load-json-file')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win

let appDir = path.dirname(require.main.filename)
let itemDb

loadJsonFile(appDir + '/db.json').then(json => {
  itemDb = json
}).catch(error => {
	console.error('error while loading database file')
	console.error(error)
})

function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 800, height: 600})

  // and load the index.html of the app.
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }))

  // Open the DevTools.
  // win.webContents.openDevTools()

  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })

  var ipc = require('electron').ipcMain

  ipc.on('process', (e, d) => {
    let data = JSON.parse(d)

    let processed = []

    let getItemCategory = (key, id) => {
      let categories = {
        'neck': 'amulet',
        'leftfinger': 'ring',
        'rightfinger': 'ring',
        'feet': 'boots',
        'hands': 'gloves',
        'head': 'helm',
        'legs': 'pants',
        'mainhand': null,
        'offhand': null,
        'shoulders': 'shoulders',
        'torso': 'chestarmors',
        'waist': 'belts',
        'wrists': 'bracers'
      }

      if (key == 'mainhand' || key == 'offhand') {
        let item = getItem(id)

        if (item.type.match(/2h/)) return '2h'

        if (item.type.match(/shield/)) return 'offhands'
        if (item.type.match(/source/)) return 'source'
        if (item.type.match(/mojo/)) return 'mojo'
        if (item.type.match(/quiver/)) return 'quiver'

        return '1h'
      }

      if (!categories[key]) throw new Error('Invalid item category ' + key)

      return categories[key]
    }

    let getItem = (id) => {
      // console.log(id)

      for (let i = 0; i < itemDb.length; ++i) {
        if (itemDb[i].id == id) {
          return itemDb[i]
        }
      }

      throw new Error('Item id ' + id + ' not found.')
    }

    let getItemFullname = (id) => {
      return getItem(id).name
    }

    let getItemStatCategory = (key) => {
      let categories = {
        'dex': 'DEX',
        'str': 'STR',
        'int': 'INT',
        'resall': 'ALLRES',
        'resarc': 'ANYRES',
        'resphy': 'ANYRES',
        'resfir': 'ANYRES',
        'respsn': 'ANYRES',
        'rescol': 'ANYRES',
        'reslit': 'ANYRES',
        'armor': 'E_ARMOR',
        'laek': 'LOK',
        'lph': 'LOH',
        'maxspirit': 'MAX_SPIRIT',
        'gf': 'GF',
        'pickup': 'PICKUP',
		'area': 'AREADMG',
        // 'rangedef': '???',
        'edef': 'ELITEDAMRED',
        'ias': 'IAS',
        'cdr': 'CDRED',
        'rcr': 'RESCOSTRED',
        'dmgfir': 'SDMG_F',
        'dmgcol': 'SDMG_C',
        'sockets': 'SOCK',
        'vit': 'VITA',
        'chc': 'CRIT',
        'chd': 'CRITDMG',
        'ms': 'MOVE',
        'weaponias': 'AS_EXTR',
        'healbonus': 'HPGLOBE',
        'life': 'LIFE',
        'edmg': 'ELITEDAM',
        'apoc': 'APOC',
        'damage': 'DMG_PBONUS',
		'maxdisc': 'MAX_DISC'
        // 'wpnphy': 'DMG_HI',
        // 'wpnhol': 'DMG_HI'

      }

      if (key.match(/skill_/)) return 'SKILLDMG'

      if (key == 'basearmor' || key == 'custom' || key == 'dura') return null

      if (!categories[key]) console.log('WARNING: category ' + key + ' not recognized.')

      return categories[key]
    }

    let getItemStats = (stats) => {
      let rStats = []

      for (let statKey in stats) {
        let stat = stats[statKey]

        let statCategory = getItemStatCategory(statKey)

        if (statCategory) rStats.push(statCategory)
      }

      return rStats
    }

    let deduceKanaiItemStats = (itemKey, itemId, profileItems) => {
      let item = getItem(itemId)
    }

    let rProfiles = []

    data.forEach((profile) => {
      // console.log(profile)
      // console.log(profile.items);

      let profileName = profile.name

      let profileItems = []

      let items = profile.items

      let kanai = profile.kanai

      for (let itemKey in items) {
        let item = items[itemKey]

        let itemCategory = getItemCategory(itemKey, item.id)
        let itemName = getItemFullname(item.id)
        let itemStats = getItemStats(item.stats)

        let pi = {}

        pi.category = itemCategory
        pi.name = itemName
        pi.stats = itemStats

        profileItems.push(pi)
      }

      for (let kanaiKey in kanai) {
			    let kanaiItem = deduceKanaiItemStats(kanaiKey, kanai[kanaiKey], profileItems)

			    // profileItems.push(kanaiItem);
      }

      rProfiles.push({
        name: profileName,
        items: profileItems
      })
    })

    // console.log(rProfiles);

    let output = ''

    let generateStatsOutputList = (s) => {
		    let list = ''

		    for (let i = 0; i < s.length; ++i) {
		        list += s[i] + '+1'
		        if (i < s.length - 1) list += ', '
      }

      return list
    }

    rProfiles.forEach((rp) => {
		    // console.log(rp)
      output += '; ' + rp.name + '\n'

      let rpItems = rp.items

      rpItems.forEach((rpi) => {
			    // console.log(rpi);
        output += '+' + rpi.category + ' = name=' + rpi.name + ' & at_least[' + (rpi.stats.length - 1) + ', ' + generateStatsOutputList(rpi.stats) + ']\n'
      })
    })

    // console.log(output);

    e.sender.send('processDone', output)
  })

  ipc.on('import', function (event, url) {
    // console.log(url);
    /* const request = net.request({
            method: 'GET',
            protocol: 'https:',
            // hostname: 'github.com',
            // port: 443,
            // path: '/'
            url: url
        })
        request.on('response', (response) => {
            console.log('hue')
            console.log(`STATUS: ${response.statusCode}`);
            response.on('error', (error) => {
                console.log(`ERROR: ${JSON.stringify(error)}`)
            })
        })
        request.on('error', () => {
            console.log('error')
        })
		request.write();
		request.end();
        // event.sender.send('importResult', result); */

    // const https = require('https');
    //
    // https.get(url, (res) => {
    //   console.log('statusCode:', res.statusCode);
    //   console.log('headers:', res.headers);
    //
    //   res.on('data', (d) => {
    // 	process.stdout.write(d);
    //   });
    //
    // }).on('error', (e) => {
    //   console.error(e);
    // });

  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
