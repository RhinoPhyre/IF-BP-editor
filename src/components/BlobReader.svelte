<script >
    import { allBuildings } from "../buildings";
    import CollapsibleSection from './CollapsibleSection.svelte'

    export let blob = "";
    let decBlob = "";
    let jsonDOM = null;
    let connectionDOM = null;
    let parcelDOM = null;
    let files = [];
    let filename = "";
    let newBuilding = {};

    function parseFile() {
        let file = files[0];
        filename = file.name;
        let reader = new FileReader();
        reader.addEventListener("load", () => { blob = reader.result;parseBlob();}, false);
        reader.readAsText(file);
    }

    function parseBlob() {
        decBlob = atob(blob);
        jsonDOM = JSON.parse(decBlob);
        if (jsonDOM.gameState) {
            parcelDOM = jsonDOM.gameState.parcels.parcelList;
            connectionDOM = jsonDOM.gameState.nodeConnections;    
            console.log(connectionDOM);        
        } else {
            parcelDOM = jsonDOM.details;
            connectionDOM = jsonDOM.connections;
        }
    }

    function encodeBlob() {
        decBlob = JSON.stringify(jsonDOM);
        blob = btoa(decBlob);
    }

    function saveBlob() {
        encodeBlob();
        var fileBlob = new Blob([blob]);
        console.log(fileBlob);
        const url = window.URL.createObjectURL(fileBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
    }

    function totalBuildings(parcel) {
        let total = 0;
        for (const building in parcel.buildings) {
            total = total + parcel.buildings[building];
        }
        return total;
    }
    function incBuilding(parcel, name) {
        let total = totalBuildings(parcel);
        if (total < parcel.maxBuildings) {
            let old = parcel.buildings[name];
            parcel.buildings[name] = old + 1;
            parcel.activeBuildings[name] = parcel.buildings[name];
            parcelDOM = parcelDOM;
        }
        encodeBlob();
    }

    function decBuilding(parcel, name) {
        let old = parcel.buildings[name];
        if (old > 0) {
            parcel.buildings[name] = old - 1;
            parcel.activeBuildings[name] = parcel.buildings[name];
            parcelDOM = parcelDOM;
        }
        encodeBlob();
    }

    function removeBuilding(parcel, name) {
        delete parcel.buildings[name];
        parcelDOM = parcelDOM;
        encodeBlob();
    }

    function removeOutput(parcel, name) {
        delete parcel.outputValues[name];
        parcelDOM = parcelDOM;
        encodeBlob();
    }

    function addBuilding(parcel, newBuilding) {
        let total = totalBuildings(parcel);
        if (total < parcel.maxBuildings) {
            let nb = (newBuilding[parcel.id]);
            parcel.buildings[nb] = 1;
            console.log(parcel.buildings);
            parcelDOM = parcelDOM; 
        } 
        encodeBlob();
    }

    function removeConnection(connection, id) {
        connectionDOM =  connectionDOM.filter((c) => c.id !== id);
        encodeBlob();
    }


</script>

Upload: <input type=file bind:files={files}> <button class="btn btn__primary" on:click={parseFile} disabled={files.length === 0}>Upload</button><br>
or Paste Blueprint:
<textarea bind:value={blob} rows=20 cols=80 />
<button class="btn btn__primary" disabled={blob.length === 0} on:click={parseBlob}>
    Parse
</button>
<button class="btn btn__primary" disabled={!jsonDOM} on:click={saveBlob}>
    Save
</button>
<br>
{#if jsonDOM}
    <iframe id="my_iframe" style="display:none;"></iframe>
    <h1>Parcels</h1>
    {#each parcelDOM as parcel, index (parcel.id)}
    <CollapsibleSection headerText='{parcel.id} ({parcel.parcelType}) - Max Buildings: {totalBuildings(parcel)}/{parcel.maxBuildings}' >
        <div class="content">
            Buildings:<button class="btn btn__primary" on:click={addBuilding(parcel, newBuilding)}>Add</button>
            <select bind:value={newBuilding[parcel.id]} name="newBuilding">
                <option value="">Choose Building...</option>
                {#each allBuildings as building}
                    <option value={building.id} style="background-image:url(icons/{building.id}-48.png);">{building.name}</option>
                {/each}
            </select><br>
            {#each Object.entries(parcel.buildings) as [name, qty]}
                <button class="btn btn__primary" on:click={decBuilding(parcel, name)}>-</button>
                <button class="btn btn__primary" on:click={incBuilding(parcel, name)}>+</button>
                <img src="icons/{name}-48.png" alt={allBuildings.filter((b) => b.id===name)[0].name} height=24 width=24/> 
                {allBuildings.filter((b) => b.id===name)[0].name }: {qty}  
                <button class="btn btn__danger" on:click={removeBuilding(parcel, name)}>Remove</button>
                <br>
            {/each}
            Outputs:<br>
            {#each Object.entries(parcel.outputValues) as [name, type]}
                {name}: {type.unloader}
                <button class="btn btn__danger" on:click={removeOutput(parcel, name)}>Remove</button><br>
            {:else}
                None<br>
            {/each}
            <br>
        </div>
    </CollapsibleSection>    
    {/each}
    <h1>Connections</h1>
    {#each connectionDOM.filter((c)=>c.id.substring(0,6) === "xyflow") as connection, index (connection.id)}
        <CollapsibleSection headerText={connection.id}>
            <div class="content">
                {connection.id} <br>
                Source: {connection.source}  Target: {connection.target} 
                <button class="btn btn__danger" on:click={removeConnection(connection, connection.id)}>Remove</button><br>
                Resource: {connection.sourceHandle}
            </div>
        </CollapsibleSection>
    {/each}
    <br /><br />
    <CollapsibleSection headerText="Full JSON">
        {decBlob && decBlob}
    </CollapsibleSection>
{/if}


