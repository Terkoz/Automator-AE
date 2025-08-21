#target aftereffects

/*
 * Automator_AE_v1_2_0_modular.jsx — Launcher (diagnóstico por módulo, BOM-safe)
 * Carga los .jsxinc en orden y retorna el Panel (o muestra paleta si se ejecuta como script).
 */

(function (thisObj) {
    var VERSION = "v1.2.0";

    function pad2(n){ return (n<10?"0":"")+n; }
    function nowStamp(){
        var d = new Date();
        return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate())+" "+pad2(d.getHours())+":"+pad2(d.getMinutes())+":"+pad2(d.getSeconds());
    }

    function logFile(){
        try{
            var f = File(Folder.userData.fsName + "/AutomatorAE.log");
            if (!f.exists){ f.encoding = "UTF-8"; f.open("w"); f.write(""); f.close(); }
            return f;
        }catch(e){ return null; }
    }
    function log(msg){
        try{ $.writeln("[AutomatorAE] " + msg); }catch(e){}
        var lf = logFile();
        if (lf){
            try{
                lf.open("a");
                lf.encoding = "UTF-8";
                lf.write("[" + nowStamp() + "] " + msg + "\n");
                lf.close();
            }catch(e){ /* no-op */ }
        }
    }

    function fileFromHere(relName){
        var here = File($.fileName).parent;
        return File(here.fsName + "/" + relName);
    }

    function evalFileNoBOM(f){
        if (!f || !f.exists) throw new Error("No existe el archivo: " + (f ? f.fsName : "undefined"));
        if (!f.open("r")) throw new Error("No se pudo abrir: " + f.fsName);
        f.encoding = "UTF-8";
        var s = f.read();
        f.close();
        if (s && s.length && s.charCodeAt(0) === 0xFEFF){
            s = s.substring(1); // strip BOM
        }
        try { eval(s); }
        catch (e) {
            var line = (e && e.line) ? (" (línea " + e.line + ")") : "";
            throw new Error("Error en " + f.name + line + ": " + e.toString());
        }
    }

    function inc(relName){
        var f = fileFromHere(relName);
        log("Cargando: " + relName);
        try {
            evalFileNoBOM(f);
            log("OK: " + relName);
        } catch (e) {
            log("FALLO: " + relName + " → " + e.toString());
            throw e;
        }
    }

    function buildPanel(thisObj){
        var win = (thisObj instanceof Panel) ? thisObj :
                  new Window("palette", "Automator AE " + VERSION, undefined, {resizeable:true});

        var order = [
            "core_serialize.jsxinc",
            "core_import.jsxinc",
            "shapes.jsxinc",
            "text.jsxinc",
            "ui.jsxinc"
        ];

        for (var i=0; i<order.length; i++) inc(order[i]);

        // Construir UI desde ui.jsxinc
        var built = false;
        try {
            if ($.global && $.global.buildAutomatorUI) {
                win = $.global.buildAutomatorUI(win, VERSION);
                built = true;
            }
        } catch(e1){ log("buildAutomatorUI (global) falló: " + e1.toString()); }
        if (!built) {
            try {
                if (typeof buildAutomatorUI === "function") {
                    win = buildAutomatorUI(win, VERSION);
                    built = true;
                }
            } catch(e2){ log("buildAutomatorUI falló: " + e2.toString()); }
        }
        if (!built) {
            try {
                var g = win.add("group");
                g.add("statictext", undefined, "UI no inicializada desde ui.jsxinc");
                built = true;
            } catch(e3){ log("Fallback UI falló: " + e3.toString()); }
        }

        try {
            if (win && win.layout) {
                win.layout.layout(true);
                win.onResizing = win.onResize = function(){ this.layout.resize(); };
                win.minimumSize = [320, 160];
            }
        } catch(e4){}

        return win;
    }

    try {
        var panel = buildPanel(thisObj);
        if (panel instanceof Window) { panel.center(); panel.show(); }
        else { return panel; }
    } catch (err) {
        log("Carga abortada: " + err.toString());
        alert("Automator: error cargando módulos\n" + err.toString());
    }
})(this);
