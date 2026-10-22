function actualizarTodo() {
  cargarNoticiasMinutoUno();
  cargarFacebookRSS();
}

function cargarNoticiasMinutoUno() {
  var url = "https://www.minutouno.com/";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("noticias") || ss.getActiveSheet();
  
  // Limpiar contenido previo para mantener siempre las últimas noticias actualizadas
  sheet.clearContents();
  
  // Encabezados de la planilla
  sheet.appendRow(["Noticia", "Enlace", "Imagen"]);

  // Opciones para simular un navegador real
  var options = {
    "muteHttpExceptions": true,
    "headers": {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    }
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    
    if (response.getResponseCode() !== 200) {
      Logger.log("Error al acceder a la página: " + response.getResponseCode());
      return;
    }

    var html = response.getContentText();
    
    // Extracción mediante expresiones regulares
    var regex = /<a[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["'][^>]*alt=["']([^"']+)["']/gi;
    var match;
    var count = 0;
    var matchCount = 0;

    while ((match = regex.exec(html)) !== null && count < 15) {
      matchCount++;
      // Saltar las dos primeras imágenes encontradas que suelen ser el Logo y el menú.
      if (matchCount <= 2) continue;

      var enlace = match[1];
      var imagenUrl = match[2];
      var titulo = match[3].trim();

      // Corregir URLs relativas
      if (enlace.startsWith("/")) enlace = "https://www.minutouno.com" + enlace;
      if (imagenUrl.startsWith("//")) imagenUrl = "https:" + imagenUrl;

      if (titulo && imagenUrl) {
        // Guardamos la URL directa de la imagen
        sheet.appendRow([titulo, enlace, imagenUrl]);
        count++;
      }
    }
  } catch (e) {
    Logger.log("Error de ejecución: " + e.toString());
  }
}

function cargarFacebookRSS() {
  var urlRSS = "https://fetchrss.com/feed/1x03vQ4tE0QO1x3h6X6k39xM.rss";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("facebook");
  
  if (!sheet) {
    Logger.log("No existe la hoja facebook");
    return;
  }

  try {
    var options = {
      "muteHttpExceptions": true,
      "headers": {
        "Cache-Control": "no-cache",
        "Pragma": "no-cache"
      }
    };
    var t = new Date().getTime();
    var response = UrlFetchApp.fetch(urlRSS + "?_t=" + t, options);
    var code = response.getResponseCode();
    if (code !== 200) {
      Logger.log("Error RSS: " + code);
      // Fallback a proxy si fetchrss devuelve 402 por IP de Google
      if (code === 402 || code === 403) {
         Logger.log("Intentando mediante proxy rss2json...");
         var proxyUrl = "https://api.rss2json.com/v1/api.json?rss_url=" + encodeURIComponent(urlRSS + "?_t=" + t);
         var proxyRes = UrlFetchApp.fetch(proxyUrl, options);
         if (proxyRes.getResponseCode() === 200) {
             var data = JSON.parse(proxyRes.getContentText());
             if (data.status === 'ok' && data.items) {
                 sheet.clearContents();
                 sheet.appendRow(["Titulo", "Enlace", "Imagen", "Fecha"]);
                 var maxItems = Math.min(data.items.length, 3);
                 for (var i = 0; i < maxItems; i++) {
                     var it = data.items[i];
                     var img = it.thumbnail || (it.enclosure ? it.enclosure.link : "");
                     sheet.appendRow([it.title || "Publicación", it.link || "", img, it.pubDate || ""]);
                 }
                 return;
             }
         }
      }
      return;
    }
    
    var xml = response.getContentText();
    var document = XmlService.parse(xml);
    var root = document.getRootElement();
    var channel = root.getChild('channel');
    
    var items = channel ? channel.getChildren('item') : root.getChildren('entry', root.getNamespace());
    if (!items || items.length === 0) return;
    
    sheet.clearContents();
    sheet.appendRow(["Titulo", "Enlace", "Imagen", "Fecha"]);
    
    var getChildText = function(el, name) {
      var child = el.getChild(name);
      return child ? child.getText() : null;
    };
    
    var maxItems = Math.min(items.length, 3);
    for (var i = 0; i < maxItems; i++) {
      var item = items[i];
      var titulo = getChildText(item, 'title') || "Publicación de Facebook";
      var enlace = getChildText(item, 'link') || getChildText(item, 'url') || "";
      var fecha = getChildText(item, 'pubDate') || getChildText(item, 'published') || new Date().toISOString();
      var imagenUrl = "";
      
      // Intentar obtener imagen de tags de media a la manera de "panella"
      try {
        var mediaNs = XmlService.getNamespace('http://search.yahoo.com/mrss/');
        var content = item.getChild('content', mediaNs);
        if (content && content.getAttribute('url')) {
          imagenUrl = content.getAttribute('url').getValue();
        } else {
          var thumbnail = item.getChild('thumbnail', mediaNs);
          if (thumbnail && thumbnail.getAttribute('url')) {
            imagenUrl = thumbnail.getAttribute('url').getValue();
          }
        }
      } catch (me) {}
      
      if (!imagenUrl) {
        var desc = getChildText(item, 'description') || "";
        var imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch && imgMatch[1]) {
          imagenUrl = imgMatch[1];
        }
      }
      
      sheet.appendRow([titulo, enlace, imagenUrl, fecha]);
    }
    
  } catch(e) {
    Logger.log("Error Facebook RSS: " + e.toString());
  }
}

function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var noticias = extraerDatos(ss.getSheetByName("noticias") || ss.getActiveSheet(), ["titulo", "enlace", "imagen"]);
  var facebook = extraerDatos(ss.getSheetByName("facebook"), ["titulo", "enlace", "imagen", "fecha"]);
  var sheetPublicidades = ss.getSheetByName("publicidades") || ss.getSheetByName("publicidad");
  var publicidades = extraerDatos(sheetPublicidades, ["titulo", "imagen", "texto", "telefono", "email", "url"]);

  return ContentService.createTextOutput(JSON.stringify({
    noticias: noticias,
    facebook: facebook,
    publicidades: publicidades
  })).setMimeType(ContentService.MimeType.JSON);
}

function extraerDatos(sheet, keys) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var result = [];
  
  // Empezar desde 1 para saltar el encabezado
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && String(data[i][0]).trim() !== "") {
      var obj = {};
      for (var j = 0; j < keys.length; j++) {
        obj[keys[j]] = data[i][j] || "";
      }
      result.push(obj);
    }
  }
  return result;
}

function doPost(e) {
  try {
    var datos;
    
    // Intentar leer desde FormData (campo 'payload') o desde body JSON crudo
    if (e.parameter && e.parameter.payload) {
      datos = JSON.parse(e.parameter.payload);
    } else if (e.postData && e.postData.contents) {
      datos = JSON.parse(e.postData.contents);
    } else {
      return ContentService.createTextOutput(JSON.stringify({
        resultado: "error",
        mensaje: "No se recibieron datos"
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (datos.action === "add_ad") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("publicidades") || ss.getSheetByName("publicidad");
      
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ 
          resultado: "error", 
          mensaje: "La hoja de publicidades no existe" 
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Asegurar que exista encabezado
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(["Titulo", "Imagen", "Texto", "Telefono", "Email", "Url"]);
      }
      
      sheet.appendRow([
        datos.titulo || "",
        datos.imagen || "",
        datos.texto || "",
        datos.telefono || "",
        datos.email || "",
        datos.url || ""
      ]);
      
      return ContentService.createTextOutput(JSON.stringify({ resultado: "success" })).setMimeType(ContentService.MimeType.JSON);
    } else if (datos.action === "edit_ad" || datos.action === "delete_ad") {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName("publicidades") || ss.getSheetByName("publicidad");
      
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ resultado: "error", mensaje: "La hoja de publicidades no existe" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      var targetTitulo = datos.tituloOriginal || datos.titulo; 
      var sheetData = sheet.getDataRange().getValues();
      var foundRow = -1;
      
      for (var i = 1; i < sheetData.length; i++) {
        if (sheetData[i][0] === targetTitulo) {
          foundRow = i + 1; 
          break;
        }
      }
      
      if (foundRow === -1) {
        return ContentService.createTextOutput(JSON.stringify({ resultado: "error", mensaje: "Publicidad no encontrada" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      if (datos.action === "delete_ad") {
        sheet.deleteRow(foundRow);
      } else if (datos.action === "edit_ad") {
        sheet.getRange(foundRow, 1, 1, 6).setValues([[
          datos.titulo || "",
          datos.imagen || "",
          datos.texto || "",
          datos.telefono || "",
          datos.email || "",
          datos.url || ""
        ]]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ resultado: "success" })).setMimeType(ContentService.MimeType.JSON);
    } else if (datos.action === "upload_image") {
      // ── Subir imagen a Google Drive ──
      var filename = datos.filename || ("imagen_" + new Date().getTime() + ".jpg");
      var mimeType = datos.mimeType || "image/jpeg";
      var base64   = datos.base64;
      
      if (!base64) {
        return ContentService.createTextOutput(JSON.stringify({
          resultado: "error", mensaje: "No se recibieron datos de imagen"
        })).setMimeType(ContentService.MimeType.JSON);
      }
      
      // Buscar o crear carpeta "Publicidades_Hits20" en Drive
      var folders = DriveApp.getFoldersByName("Publicidades_Hits20");
      var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("Publicidades_Hits20");
      
      // Crear el archivo desde base64
      var decoded = Utilities.base64Decode(base64);
      var blob    = Utilities.newBlob(decoded, mimeType, filename);
      var file    = folder.createFile(blob);
      
      // Hacerlo público para que cualquiera pueda ver la imagen
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      // Usar CDN público de Google en vez de drive.google.com/uc?export=view
      // La URL de drive.google.com falla en etiquetas <img> de sitios externos
      // por restricciones de CORS/referrer. lh3.googleusercontent.com/d/ID
      // sirve la imagen directamente sin esas restricciones.
      var fileId  = file.getId();
      var fileUrl = "https://lh3.googleusercontent.com/d/" + fileId;
      
      return ContentService.createTextOutput(JSON.stringify({
        resultado: "success",
        url: fileUrl
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ 
      resultado: "error", 
      mensaje: "Acción no soportada" 
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      resultado: "error", 
      mensaje: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}