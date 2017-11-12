const { ipcRenderer } = require('electron')

global.sendData = () => {
    ipcRenderer.sendToHost(JSON.stringify(DiabloCalc.getAllProfiles().profiles))
}
