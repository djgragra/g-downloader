ES = dict(manual="Manual de usuario", version="Versión", license="Licencia MIT © 2026 Graziano Melzi", toc="Contenido", sections=[
("Introducción", """
<p>G-Downloader es una aplicación gratuita para Windows, macOS y Linux que ejecuta <b>descargas programadas</b> y permanece activa en segundo plano (icono en la bandeja del sistema). Se diseñó para el uso en radiodifusión —por ejemplo, para recoger cada día archivos de audio, programaciones o boletines de noticias desde servidores web, FTP o carpetas de red—, pero sirve para cualquier otro caso en el que haya que descargar un archivo a horas precisas.</p>
<h3>Qué puede hacer</h3>
<ul>
<li>Orígenes <b>web</b> (HTTP/HTTPS, con usuario y contraseña, peticiones GET o POST), <b>FTP/FTPS</b> y <b>archivos locales o de red</b>.</li>
<li>URL y nombres de archivo <b>dinámicos</b>: fecha, hora, contador, valores aleatorios, desplazamientos (por ejemplo, «la hora siguiente»), zona horaria y horario de verano (p. ej. <code>gmt</code>/<code>bst</code> en el nombre), comodines en el nombre del archivo para FTP y archivos locales.</li>
<li>Varias <b>programaciones</b> por tarea: días de la semana y horas, una sola vez, cada N segundos/minutos/horas/días o una expresión cron.</li>
<li><b>Acciones</b> antes y después de la descarga: limpieza de carpetas, cambio de nombre de los archivos existentes, ejecución de programas o scripts, mover, abrir, notificaciones.</li>
<li><b>Reintentos automáticos</b> en caso de error, <b>espera de un archivo que se publica tarde</b> (capítulo 13.1) y avisos por <b>correo electrónico</b> y <b>Telegram</b>; informe resumen periódico.</li>
<li><b>Excepciones de calendario</b>: omitir un día o hacer que siga las programaciones de otro día de la semana (capítulo 8.6).</li>
<li><b>Panel</b> con estadísticas y gráficos, categorías con colores, historial, archivos de registro.</li>
<li>Interfaz en <b>italiano, inglés y español</b>, tema claro y oscuro, formatos de fecha y hora personalizables.</li>
<li><b>Actualizaciones guiadas</b>: la app avisa de las versiones nuevas y descarga y verifica el instalador correcto, sin instalar nada sin tu consentimiento.</li>
</ul>
<div class="note">La app no tiene un certificado de pago: en el primer inicio, Windows y macOS pueden mostrar un aviso. El capítulo 3 explica qué hacer.</div>
""", False),
("Requisitos", """
<table><tr><th>Sistema</th><th>Qué necesitas</th></tr>
<tr><td>Windows</td><td>Instalador <code>G-Downloader-Setup-{v}.exe</code> (64 bits). Sin requisitos adicionales.</td></tr>
<tr><td>macOS</td><td>Un archivo <code>.dmg</code>: el que no lleva sufijo para los Mac Intel y el que termina en <code>-arm64</code> para los Mac Apple Silicon (M1 y posteriores).</td></tr>
<tr><td>Linux</td><td><code>G-Downloader-{v}.AppImage</code> (64 bits), en una distribución con escritorio gráfico.</td></tr></table>
<p>Las versiones mínimas de los sistemas operativos no se han verificado formalmente: usa sistemas actualizados.</p>
<p>Una conexión a Internet (o acceso a la red local) para los orígenes. Los avisos por correo electrónico necesitan una cuenta SMTP; los avisos por Telegram necesitan un bot de Telegram.</p>
""", False),
("Instalación", """
<p>Los instaladores están en la página de versiones: <code>github.com/djgragra/g-downloader/releases</code>. Junto a ellos está <code>SHA256SUMS.txt</code>, con las sumas de comprobación para verificar su integridad.</p>
<h3>3.1 Windows</h3>
<ol><li>Descarga y ejecuta <code>G-Downloader-Setup-{v}.exe</code>.</li>
<li>Si aparece la pantalla azul <i>«Windows protegió su PC»</i> (SmartScreen), pulsa <b>Más información</b> y después <b>Ejecutar de todos modos</b>: ocurre porque la app no tiene un certificado de pago.</li>
<li>Elige la carpeta de instalación (o deja la propuesta) y confirma. Se crean los accesos directos en el escritorio y en el menú Inicio.</li>
<li>Al terminar, la app se inicia sola.</li></ol>
<p><b>Desinstalación:</b> Configuración → Aplicaciones → G-Downloader → Desinstalar. Tus tareas y ajustes permanecen en la carpeta de datos (capítulo 17) hasta que los borres a mano.</p>
<h3>3.2 macOS</h3>
<ol><li>Abre el archivo <code>.dmg</code> adecuado para tu Mac y arrastra <b>G-Downloader</b> a la carpeta <b>Aplicaciones</b>.</li>
<li>Inicia la app desde Aplicaciones. Si macOS dice que la app está <i>«dañada»</i> o que <i>«no se puede abrir»</i>, no está dañada. La app tiene una firma ad-hoc, así que el primer inicio muestra <i>«desarrollador no identificado»</i>: abre <b>Ajustes del Sistema → Privacidad y seguridad</b> y pulsa <b>Abrir de todos modos</b> (el clic derecho → Abrir ya no existe desde macOS 15). Si una versión anterior a la 26.10.4 dice que está dañada, ejecuta desde Terminal:
<pre><code>xattr -cr /Applications/G-Downloader.app &amp;&amp; codesign --force --deep -s - /Applications/G-Downloader.app</code></pre></li>
<li>El icono aparece en la barra de menús, arriba. Cerrar la ventana no detiene la app.</li></ol>
<p><b>Desinstalación:</b> arrastra la app a la Papelera; los datos permanecen en <code>~/Library/Application Support/g-downloader</code>.</p>
<h3>3.3 Linux</h3>
<ol><li>Haz el archivo ejecutable y ejecútalo:<pre><code>chmod +x G-Downloader-{v}.AppImage
./G-Downloader-{v}.AppImage</code></pre></li>
<li>Si tu distribución necesita FUSE para los AppImage, instálalo con el gestor de paquetes (por ejemplo, <code>libfuse2</code>).</li>
<li>El icono aparece en la bandeja del sistema (si tu escritorio la admite).</li></ol>
<p><b>Desinstalación:</b> borra el archivo AppImage; los datos permanecen en <code>~/.config/g-downloader</code>.</p>
""", True),
("Primer inicio y visión general", """
<p>Al iniciarse aparece la ventana principal, dividida en estas zonas:</p>
<ul>
<li><b>Barra lateral (izquierda):</b> logotipo, botones <i>Panel</i> y <i>Programación</i>, la lista de <b>próximas descargas</b>, los botones <i>+ Tarea</i> e <i>Importar</i>, la lista de tareas agrupadas por categoría y, abajo, <i>Ajustes</i> y <i>Ayuda e información</i>.</li>
<li><b>Barra superior:</b> un <b>reloj</b> grande, la <b>próxima descarga</b> con una cuenta atrás destacada y, mientras se ejecuta una descarga, su barra de progreso. Aquí aparece también el aviso de actualización, si lo hay (capítulo 16).</li>
<li><b>Zona central:</b> muestra el panel, la programación, el editor de una tarea, los ajustes o la página de información, según la sección.</li>
<li><b>Consola (abajo):</b> cerrada por defecto; ábrela con la flecha y cambia su tamaño arrastrando el borde. Muestra en tiempo real lo que hace la app.</li>
</ul>
<h3>La app sigue funcionando en segundo plano</h3>
<p>Cerrar la ventana <b>no</b> detiene la app: sigue ejecutando las programaciones, con su icono en la bandeja del sistema. Para salir de verdad, usa el menú del icono → <b>Salir</b>. Las programaciones solo se activan mientras la app está en marcha (consulta también «Iniciar G-Downloader al encender el equipo» en el capítulo 14).</p>
<h3>Idioma</h3>
<p>Elige el idioma en <b>Ajustes → Idioma</b>: cambia toda la interfaz, los mensajes, la guía y los nombres de los días y los meses.</p>
""", False),
("Crear tu primera tarea", """
<p>Una <b>tarea</b> describe qué descargar, dónde guardarlo, cómo llamarlo y cuándo. Para crear una:</p>
<ol>
<li>Pulsa <b>+ Tarea</b> en la barra lateral (o <i>+ Nueva tarea</i> en la Programación).</li>
<li>Dale a la tarea un <b>nombre</b> y, si quieres, una <b>categoría</b>.</li>
<li>En la tarjeta <b>Origen</b> elige el tipo (web o archivo local/de red) e introduce la URL o la ruta.</li>
<li>En la tarjeta <b>Destino y nombre de archivo</b> elige la carpeta (con <i>Examinar…</i>) y cómo nombrar el archivo.</li>
<li>En la tarjeta <b>Programaciones</b> añade al menos una hora.</li>
<li>Pulsa <b>Guardar</b>. Para probarla enseguida usa <b>▶ Ejecutar ahora</b>.</li>
</ol>
<div class="note"><b>Nota:</b> el interruptor «Ejecutar inmediatamente tras guardar» está apagado por defecto. Guardar una tarea <b>no</b> inicia ninguna descarga ni activa horas pasadas: las programaciones se aplican a partir de ese momento.</div>
<p>Para desactivar una tarea temporalmente sin borrarla, usa el interruptor junto a su nombre o el botón <i>Desactivar</i> en la Programación.</p>
""", True),
("Orígenes", """
<h3>6.1 Web (HTTP/HTTPS)</h3>
<p>Introduce la URL completa. Puede contener <b>marcadores dinámicos</b> (capítulo 7). Opciones:</p>
<table><tr><th>Opción</th><th>Significado</th></tr>
<tr><td>Método HTTP</td><td><b>GET</b> (por defecto) pide el archivo; <b>POST</b> envía además un cuerpo (JSON o texto sin formato, con marcadores) a los servidores que lo requieren.</td></tr>
<tr><td>Tiempo de espera</td><td>Espera máxima en milisegundos (por defecto 30000).</td></tr>
<tr><td>El servidor requiere autenticación</td><td>Activa usuario y contraseña para la autenticación HTTP. La contraseña se guarda cifrada con el sistema de protección del equipo (Windows DPAPI, llavero de macOS, libsecret en Linux).</td></tr></table>
<h3>6.2 FTP / FTPS</h3>
<p>Usa una URL como <code>ftp://servidor/carpeta/archivo.mp3</code> o <code>ftps://…</code>, con usuario y contraseña en la tarjeta de autenticación. Atención: <code>ftp://servidor/dir/archivo</code> es relativa a la carpeta de inicio de sesión; para una ruta absoluta usa una barra doble <code>ftp://servidor//dir/archivo</code>. Si no se encuentra el archivo, el registro indica en qué carpeta busca la app y qué archivos ve, de modo que se distingue de inmediato si el error está en el nombre o en la carpeta.</p>
<h3>6.3 Archivo local o de red</h3>
<p>Elige <i>Archivo local / de red</i> e introduce la ruta (por ejemplo, <code>D:\\Audio\\programa.mp3</code> o <code>\\\\servidor\\audio\\clip.mp3</code>). El archivo se copia a la carpeta de destino. Si todavía no está allí, se reintenta igual que con los orígenes web.</p>
<h3>6.4 Nombre de archivo que no se conoce de antemano (comodín)</h3>
<p>En las direcciones <b>FTP</b> y en los <b>archivos locales o de red</b> el nombre del archivo puede llevar <code>*</code> (cualquier carácter) y, en los archivos locales, <code>?</code> (un carácter), por ejemplo <code>ftp://server/news/BULLETIN_*.mp2</code> o <code>D:\\In\\BULLETIN_*.mp2</code>. En cada intento la aplicación lee la carpeta y toma el archivo <b>más reciente</b> que coincide (por fecha de modificación y después por nombre). Si coinciden varios, el registro enumera los demás. Si el más reciente es el archivo tomado la vez anterior y no ha cambiado, <b>no ha llegado nada nuevo</b>: cuenta como «aún no disponible» (la ventana de espera y los reintentos siguen), así el archivo de ayer nunca se guarda de nuevo por error. Con <i>Nombre desde la dirección</i> el archivo conserva su nombre real. Solo el nombre del archivo puede llevar comodines, nunca la carpeta. Las direcciones web (HTTP/HTTPS) no pueden: un servidor web no da la lista de sus archivos.</p>
<h3>6.5 Reintentos en caso de error</h3>
<p>Para cada tarea puedes fijar cuántos <b>intentos</b> hacer (por defecto 3) y cuánto <b>esperar</b> entre ellos (por defecto 15 segundos). Los valores por defecto de las tareas nuevas se cambian en Ajustes. Si el último intento también falla, la tarea se marca como fallida y, si está activado, se envía el aviso por correo o Telegram.</p>
""", False),
("Marcadores dinámicos", """
<p>En la URL, la ruta del archivo, el nombre del archivo y las acciones puedes usar marcadores que se sustituyen en cada ejecución. Debajo de los campos hay botones que los insertan en el cursor.</p>
<table><tr><th>Marcador</th><th>Resultado</th></tr>
<tr><td><code>{date:yyyyMMdd}</code></td><td>la fecha de hoy, p. ej. <code>20260926</code></td></tr>
<tr><td><code>{date:yyyy-MM-dd}</code></td><td>fecha ISO, p. ej. <code>2026-09-26</code></td></tr>
<tr><td><code>{time:HHmmss}</code></td><td>hora actual, p. ej. <code>084500</code></td></tr>
<tr><td><code>{date+1h:H}</code></td><td>fecha/hora <b>desplazada</b>: aquí la hora siguiente (p. ej. 7 a las 6:57). También <code>-1d</code>, <code>+30m</code>, etc.</td></tr>
<tr><td><code>{tz:lower}</code></td><td>abreviatura de la zona horaria del ordenador, p. ej. <code>gmt</code>/<code>bst</code> o <code>cet</code>/<code>cest</code> (cambia con el horario de verano). <code>{tz}</code> mantiene las mayúsculas; <code>{tz:Europe/London:upper}</code> usa una zona fija (cualquier nombre IANA)</td></tr>
<tr><td><code>{dst:bst|gmt}</code></td><td>el <b>primer</b> texto con el horario de verano, el <b>segundo</b> en caso contrario (texto libre; para otra zona: <code>{dst@Europe/London:bst|gmt}</code>)</td></tr>
<tr><td><code>{time@Europe/London:HH}</code></td><td>fecha u hora como reloj de <b>otra zona</b>: <code>{date@…:…}</code> y <code>{time@…:…}</code></td></tr>
<tr><td><code>{seq:4}</code></td><td>contador progresivo por tarea (<code>0001</code>, <code>0002</code>, …)</td></tr>
<tr><td><code>{rand:6}</code></td><td>cadena aleatoria de 6 caracteres</td></tr>
<tr><td><code>{env:NOMBRE}</code></td><td>valor de una variable de entorno</td></tr></table>
<p>El formato tras los dos puntos usa las letras habituales: <code>yyyy</code> año, <code>MM</code> mes, <code>dd</code> día, <code>HH</code> horas (00–23), <code>mm</code> minutos, <code>ss</code> segundos.</p>
<p><b>Ejemplo:</b> <code>https://example.com/audio/programa_{date:yyyyMMdd}_{date+1h:HH}.mp3</code> descarga cada hora el archivo de la hora siguiente.</p>
<p><b>Cerca de medianoche:</b> si el nombre lleva la fecha y la hora siguiente, desplaza <b>ambas</b>: <code>BULLETIN_{date+1h:yyyyMMdd}_{date+1h:HH}.mp2</code>. A las 23:57 da la fecha del día siguiente con hora <code>00</code>; con <code>{date:yyyyMMdd}</code> sin desplazar, el archivo de medianoche tendría la fecha equivocada.</p>
<p>Para las tareas cuya URL depende de la fecha y la hora aparece un menú <b>«Ejecutar edición…»</b>: enumera las últimas apariciones programadas y permite descargar a mano una edición perdida, usando su fecha y hora en el nombre del archivo.</p>
""", False),
("Programaciones", """
<p>Cada tarea puede tener <b>varias programaciones independientes</b>, incluso muy distintas entre sí. En la tarjeta <i>Programaciones</i> pulsa <b>+ Añadir programación</b> y elige el tipo.</p>
<h3>8.1 Días de la semana + hora</h3>
<p>Marca los días (o usa los botones <i>Lun-Vie</i>, <i>Sáb-Dom</i>, <i>Todos los días</i>) y añade una o más horas. Para un solo día marca solo una casilla. <i>+ Añadir hora</i> propone la hora siguiente a la última: práctico para un boletín cada hora o para horas fijas pero irregulares (por ejemplo, cada hora de 6 a 20 salvo las 13 y las 17).</p>
<h3>8.2 Expresión cron avanzada</h3>
<p>Para casos especiales puedes escribir una expresión cron de 5 campos (<code>minuto hora día mes díaSemana</code>). El botón <b>? Ayuda</b> abre una referencia rápida con ejemplos.</p>
<table><tr><th>Expresión</th><th>Significado</th></tr>
<tr><td><code>0 9 * * *</code></td><td>todos los días a las 9:00</td></tr>
<tr><td><code>*/15 * * * *</code></td><td>cada 15 minutos</td></tr>
<tr><td><code>30 8 * * 1-5</code></td><td>a las 8:30, de lunes a viernes</td></tr>
<tr><td><code>0 9 * * 0,6</code></td><td>a las 9:00 los fines de semana</td></tr></table>
<h3>8.3 Una sola vez</h3>
<p>Una fecha y una hora precisas; la tarea se activa una sola vez.</p>
<h3>8.4 Repetir a intervalos</h3>
<p>Se repite cada N <b>segundos, minutos, horas o días</b>. Puedes fijar un <b>inicio</b> (<i>A partir de</i>: la primera ejecución ocurre a esa hora y luego se repite en cada intervalo) y un límite (<i>Repetir hasta</i>). Si el campo de inicio está vacío, empieza enseguida.</p>
<h3>8.5 Opciones comunes a todas las programaciones</h3>
<ul>
<li><b>Etiqueta</b>: un nombre para reconocer la programación en la lista y en el registro.</li>
<li><b>URL solo para esta programación</b>: si el archivo cambia según la hora o el día, puedes dar una URL distinta a una sola programación. Si está vacía, se usa la URL de la tarea.</li>
<li><b>👁 Vista previa</b>: muestra las próximas apariciones calculadas.</li>
<li><b>+1h</b>: duplica la programación desplazada una hora hacia delante.</li>
<li>El interruptor <b>Activada</b> suspende una sola programación.</li>
</ul>
<h3>8.6 Excepciones de calendario</h3>
<p>Debajo de las programaciones, la tarjeta <b>Excepciones de calendario</b> enumera los días en que esta tarea no se ejecuta de la forma habitual. Elige un día (o un primer y un último día, ambos incluidos), lo que ocurre y, si quieres, una nota; después <b>+ Añadir excepción</b> y <b>Guardar</b>.</p>
<table><tr><th>Modo</th><th>Qué ocurre esos días</th></tr>
<tr><td><b>Omitir</b></td><td>no se descarga nada: producción parada, un festivo (15 de agosto, 25 de diciembre).</td></tr>
<tr><td><b>Tratar como otro día de la semana</b></td><td>el día sigue las programaciones de ese día de la semana. Ejemplo: una agencia de noticias aplica su horario de domingo en un miércoles festivo; con <i>Tratar como domingo</i> las programaciones «Lun–Vie» se quedan quietas y se ejecutan las del fin de semana (así que conserva una programación de entre semana y otra de fin de semana, cada una con sus horas). Una expresión cron da, ese día, las horas que tiene en el día más cercano con ese día de la semana de la misma semana.</td></tr></table>
<ul>
<li><b>Varias tareas a la vez:</b> <i>Aplicar a varias tareas…</i> añade la misma excepción a las tareas que marques, o a toda una categoría con un clic. Cada tarea conserva su propia copia, que puedes cambiar o quitar por separado.</li>
<li>Los festivos se introducen <b>a mano</b>: varían de un país a otro y no todos los festivos cambian las descargas.</li>
<li>Un día omitido aparece como <i>omitido (excepción)</i> en la actividad reciente, con una etiqueta <i>Omitida hoy</i> en la tarea; no es un fallo: ni aviso, ni error en las estadísticas ni en el informe resumen. El nombre del archivo sigue usando la fecha real. Las ejecuciones manuales y las programaciones de una sola vez no se ven afectadas; las programaciones cada N minutos se detienen los días omitidos y <i>Tratar como</i> no las desplaza.</li>
</ul>
<div class="note">Las programaciones no recuperan horas pasadas: si la app está apagada a la hora programada, esa descarga no se ejecuta. Activa <b>«Avisar al iniciar si se omitieron programaciones»</b> (Ajustes → Fiabilidad) para que te lo diga.</div>
""", True),
("Destino y nombre de archivo", """
<h3>9.1 Carpeta de destino</h3>
<p>Introduce la carpeta (con <i>Examinar…</i>). Si está vacía, se usa la carpeta por defecto de Ajustes.</p>
<h3>9.2 Nombre del archivo</h3>
<table><tr><th>Modo</th><th>Comportamiento</th></tr>
<tr><td>Nombre fijo</td><td>el archivo recibe siempre el mismo nombre</td></tr>
<tr><td>Como en la URL</td><td>usa el nombre que hay al final de la URL</td></tr>
<tr><td>Plantilla con marcadores</td><td>p. ej. <code>programa_{date:yyyy-MM-dd}.mp3</code></td></tr>
<tr><td>Preguntar dónde guardar</td><td>al terminar la descarga se abre una ventana «Guardar como»</td></tr></table>
<h3>9.3 Si ya existe un archivo con el mismo nombre</h3>
<ul><li><b>Conservar el anterior cambiándole el nombre</b> (por defecto): el archivo existente pasa a llamarse <code>nombre.old-fecha-hora</code>; el nombre limpio queda siempre reservado para el último archivo descargado.</li>
<li><b>Sobrescribir</b>: sin copia, útil para las carpetas de intercambio.</li></ul>
<h3>9.4 Limpieza de la carpeta de destino</h3>
<p>Antes (o después) de la descarga, la app puede limpiar la carpeta:</p>
<table><tr><th>Ajuste</th><th>Opciones</th></tr>
<tr><td>Acción</td><td>No hacer nada · Borrar archivos · Mover los archivos a otro sitio</td></tr>
<tr><td>Qué archivos</td><td>todo lo que hay en la carpeta · solo el archivo con el mismo nombre · solo los archivos que coinciden con un patrón (p. ej. <code>informe_*.mp3; *.tmp</code>) · solo los archivos con más de N días/horas · todos menos los N más recientes</td></tr>
<tr><td>Subcarpetas</td><td>incluirlas o tocar solo los archivos</td></tr>
<tr><td>Cómo borrar</td><td>de forma permanente · a la papelera del sistema (no funciona en carpetas de red) · a una subcarpeta <code>_cestino</code> que se vacía sola tras N días (funciona también en carpetas de red)</td></tr>
<tr><td>Cuándo</td><td>antes de descargar · o solo después de una descarga correcta</td></tr></table>
<div class="warn"><b>Atención:</b> con «Borrar archivos» y «Todo lo que hay en la carpeta» se borran <b>todos</b> los archivos de la carpeta, incluso los que no ha descargado esta tarea. Si la carpeta se comparte con otras tareas o programas, elige «solo el archivo con el mismo nombre» o un patrón. Con «Antes de descargar», si la descarga falla después, los archivos borrados no vuelven: para borrar solo tras una descarga correcta elige «Solo después de una descarga correcta». En cualquier caso, la app se niega a vaciar la raíz de una unidad.</div>
<h3>9.5 Seguridad y mantenimiento de la carpeta</h3>
<ul>
<li><b>A prueba de fallos</b> (con «Antes de descargar»): los archivos que hay que borrar o mover se <i>apartan</i> primero en una carpeta oculta. Si la descarga tiene éxito, se completa la limpieza; si falla, los archivos vuelven donde estaban. Si la app se interrumpe a medias, los devuelve ella sola en el siguiente inicio.</li>
<li><b>Papelera con caducidad</b>: con «A una subcarpeta <code>_cestino</code>», los archivos borrados acaban en <code>_cestino/fecha-hora</code> dentro de la carpeta de destino y se borran definitivamente pasado el número de días elegido. La limpieza no toca nunca la carpeta <code>_cestino</code>.</li>
<li><b>Copias antiguas</b> (<code>nombre.old-fecha.ext</code>): cuando un archivo nuevo sustituye a otro con el mismo nombre, se conserva el anterior. Con <i>conservar como máximo N</i> y/o <i>borrar las de más de N días</i> no se acumulan para siempre (0 = sin límite).</li>
<li><b>Límite de tamaño</b>: introduce un tamaño en GB; si la carpeta lo supera, tras cada descarga se borran <b>definitivamente</b> los archivos más antiguos hasta que quepa. El archivo recién descargado no se toca nunca.</li>
<li><b>👁 Vista previa de la limpieza</b>: enumera lo que se movería o se borraría ahora mismo (limpieza, copias antiguas, límite de tamaño, papelera caducada), sin tocar nada.</li>
<li><b>🧹 Limpiar ahora</b>: ejecuta solo la limpieza, sin descargar, tras mostrar la lista y pedir confirmación. Está en el mismo recuadro y funciona como la «Solo limpieza» de la tarea.</li>
</ul>
<h3>9.6 Comprobación de integridad</h3>
<p>En el campo <b>Suma de comprobación SHA-256 esperada</b> puedes introducir la suma que debe tener el archivo: si el archivo descargado no coincide, la descarga cuenta como fallida.</p>
""", False),
("Acciones tras la descarga", """
<p>En la tarjeta <i>Acciones tras la descarga</i> puedes añadir una o más acciones, que se ejecutan <b>en orden</b> y solo si la descarga ha tenido éxito. Sus campos admiten los marcadores <code>{filepath}</code> (ruta completa), <code>{filename}</code>, <code>{folder}</code>, <code>{taskName}</code> y fechas/horas.</p>
<table><tr><th>Acción</th><th>Qué hace</th></tr>
<tr><td>Ejecutar programa/script</td><td>lanza un programa con argumentos (uno por línea) o una <b>línea de comandos completa</b> (una por línea, pegada tal cual: Start, tuberías, redirecciones y comillas funcionan como en el símbolo del sistema).</td></tr>
<tr><td>Mover archivo</td><td>mueve el archivo descargado a otra carpeta (con marcadores, p. ej. <code>D:\\Archivo\\{date:yyyy}</code>).</td></tr>
<tr><td>Abrir archivo/carpeta</td><td>abre el archivo descargado o la carpeta de destino.</td></tr>
<tr><td>Notificación del sistema</td><td>muestra una notificación con el título y el mensaje que elijas.</td></tr></table>
<h3>Pausas y retrasos en los comandos</h3>
<ul><li><b>Espera inicial</b>: segundos que esperar tras la descarga, antes de la primera línea (una sola vez).</li>
<li><b>Pausa entre una línea y la siguiente</b>: segundos que esperar entre dos comandos del mismo campo (no entre acciones distintas: cada una tiene su propia espera inicial).</li>
<li>Una línea como <code>timeout /t 5</code>, <code>wait 5</code> o <code>sleep 5</code> se interpreta como una pausa de 5 segundos.</li>
<li>Las líneas vacías y las que empiezan por <code>::</code> o <code>REM</code> se ignoran.</li></ul>
<p>El interruptor <b>«Si el comando falla, marcar la tarea como fallida»</b> decide si un comando fallido detiene la secuencia y cuenta como error.</p>
<h3>Ejecutar solo una parte de una tarea</h3>
<p>En el editor, junto a <b>▶ Ejecutar ahora</b> (que descarga y ejecuta las acciones), encontrarás:</p>
<ul><li><b>⬇ Solo descarga</b>: descarga el archivo pero no ejecuta las acciones.</li>
<li><b>⚙ Solo acciones</b>: ejecuta las acciones sobre el archivo que ya está, sin descargar. Es útil, por ejemplo, cuando el archivo te ha llegado por correo o lo han copiado a mano en la carpeta y solo quieres empezar la edición. La app usa el archivo que la tarea habría descargado (mismo nombre y carpeta); si no está, prueba con el último archivo descargado; si tampoco existe, te pide que elijas el archivo.</li>
<li><b>▶ Ejecutar</b> en cada acción: ejecuta esa sola acción, aunque esté desactivada.</li></ul>
<ul><li><b>📂 Acciones sobre otro archivo…</b>: eliges un archivo cualquiera y las acciones se ejecutan sobre ese, aunque la tarea tenga un archivo propio.</li>
<li><b>👁 Vista previa</b> en cada acción: muestra los comandos con todos los marcadores ya rellenados (archivo, carpeta, fechas), sin ejecutarlos. Práctico para asegurarte de que no empiezas la edición con el archivo equivocado.</li></ul>
<p>Junto a los botones y en las tarjetas de la Programación aparece el estado <b>«archivo presente»</b> (con el nombre del archivo y de dónde viene: archivo de la tarea, último descargado o en espera) o «sin archivo: se te preguntará».</p>
<h3>Tras la descarga: acciones, sin acciones o confirmación</h3>
<p>Cada <b>programación</b> tiene una opción <b>Tras la descarga</b>:</p>
<table><tr><th>Opción</th><th>Efecto</th></tr>
<tr><td>Ejecutar las acciones siguientes</td><td>el comportamiento habitual (por defecto)</td></tr>
<tr><td>Solo descarga</td><td>solo descarga; tú inicias las acciones cuando quieras</td></tr>
<tr><td>Esperar mi confirmación y avisarme</td><td>descarga y después envía una notificación (sistema, correo y Telegram, si están activados) y marca la tarea como <b>«Acciones en espera»</b>. Pulsa <b>▶ Ejecutar acciones ahora</b> en el editor de la tarea (o <b>⚙ Solo acciones</b> en la Programación) para iniciarlas.</td></tr></table>
<p>La opción solo se aplica a las descargas iniciadas por la programación: «Ejecutar ahora» ejecuta siempre todo.</p>
<p>«Solo acciones» está disponible también en las tarjetas de la Programación. Las ejecuciones parciales aparecen en la consola y en el historial, pero no cuentan como descargas en las estadísticas.</p>
<div class="warn">Las acciones ejecutan comandos en tu equipo. Importa solo archivos de tareas de confianza: la app te avisa cuando un archivo importado contiene comandos que se van a ejecutar.</div>
""", True),
("Panel y programación", """
<h3>11.1 Panel</h3>
<p>El panel resume la actividad:</p>
<ul><li>tarjetas con tareas totales y activas, en cola en las próximas 24 horas, completadas y fallidas hoy, tasa de éxito (últimos 30 días), datos descargados y duración media;</li>
<li>gráfico de la actividad de los últimos 7, 14 o 30 días (completadas y fallidas) y de las descargas por hora del día;</li>
<li>lista de las próximas 24 horas, actividad reciente y tareas con más errores;</li>
<li>tareas por <b>categoría</b>.</li></ul>
<p>Casi todo se puede <b>pulsar</b>: pulsa una tarea para abrir su editor, pulsa una categoría para filtrar la lista de la barra lateral. Los botones <b>🧹 Borrar</b> reinician la vista de la actividad reciente o del recuento de errores (el historial de las tareas se conserva).</p>
<h3>11.2 Programación</h3>
<p>Muestra todas las tareas como tarjetas: próxima hora con cuenta atrás, programaciones, última descarga, resultado de los últimos intentos, origen y destino. Desde cada tarjeta puedes <b>▶ Ejecutar ahora</b>, abrir el último archivo, activar/desactivar o editar la tarea. La vista <b>Todas las ejecuciones</b> enumera por orden cronológico cada ejecución prevista en las próximas 24 horas o 7 días.</p>
<h3>11.3 Buscar, filtrar y ordenar las tareas</h3>
<p>Encima de la lista de tareas (barra lateral) y en la parte superior de la Programación hay un <b>cuadro de búsqueda</b> con dos menús:</p>
<ul><li><b>Búsqueda</b>: encuentra las palabras que escribes (puede haber varias) en el nombre, la categoría, la dirección o ruta del origen, la carpeta de destino y las etiquetas de las programaciones.</li>
<li><b>Orden</b>: por categoría (agrupadas, como antes), A → Z, por hora de la próxima ejecución, por estado (primero los errores, luego las acciones en espera).</li>
<li><b>Filtro</b>: todas, activas, desactivadas, con errores, con acciones en espera.</li></ul>
<p>La búsqueda y el filtro se aplican tanto a la barra lateral como a la Programación; el orden se elige por separado para cada una (por defecto: por categoría en la barra lateral, por hora en la Programación). El último orden y filtro se <b>recuerdan</b> al volver a abrir la app; el texto de búsqueda no. La ✕ vuelve a la vista completa. La barra lateral muestra «(3/12)» cuando una vista oculta algunas tareas. El botón <b>🔍</b> junto a «Tareas» oculta o muestra la barra de búsqueda para ganar espacio en la lista (la elección se recuerda; si hay una vista activa con la barra oculta, el botón aparece resaltado). Con pocas tareas (hasta 4) la barra de herramientas permanece oculta.</p>
<h3>11.4 Categorías</h3>
<p>Cada tarea puede tener una categoría (texto libre). A cada categoría se le asigna automáticamente un <b>color</b>, que se usa en la lista, la programación y las etiquetas; puedes cambiarlo en <i>Ajustes → Categorías y colores</i> y restablecer el automático.</p>
""", False),
("Avisos: correo electrónico y Telegram", """
<p>Para las descargas que fallan tras todos los intentos (y para los avisos de «origen bloqueado» o de programaciones omitidas) la app puede enviar mensajes. Se configuran en <b>Ajustes</b>; para cada tarea, el envío se activa o desactiva con «Avisar por correo/Telegram si la descarga falla…».</p>
<p>Ajustes → <b>Avisos</b>. Cada mensaje empieza por <code>[G-Downloader · nombre de la instalación]</code> (el nombre se fija en Ajustes → General; si está vacío, se usa el nombre del equipo), de modo que, con varios PC en el estudio, sabes cuál escribe. Cada canal se intenta tres veces (de inmediato, a los 10 segundos, a los 60 segundos) y un canal que falla nunca detiene al otro. Las contraseñas y el token de Telegram no aparecen nunca en los mensajes ni en los registros.</p>
<h3>12.1 Correo electrónico</h3>
<p>Activa «Activar avisos por correo» y rellena servidor SMTP, puerto, usuario, contraseña, remitente y destinatarios (un solo campo, separados por comas, espacios o saltos de línea; como máximo 20). <b>Se envía un solo mensaje a todos, con los destinatarios en copia oculta (Bcc)</b>: nadie ve las direcciones de los demás. Con un nombre de usuario, la conexión debe estar cifrada: <i>SSL/TLS desde el principio</i> (normalmente puerto 465) o STARTTLS (normalmente puerto 587): la contraseña nunca viaja en claro. El botón del ojo muestra u oculta la contraseña. <b>Enviar correo de prueba</b> comprueba la configuración.</p>
<h3>12.2 Telegram</h3>
<ol><li>En Telegram abre <b>@BotFather</b>, escribe <code>/newbot</code> y elige un nombre y un nombre de usuario que termine en «bot».</li>
<li>BotFather responde con el <b>token</b> (del tipo <code>123456789:AAF…</code>): cópialo en «Token del bot». El token es como una contraseña: no lo publiques. Si cae en malas manos, <code>/revoke</code> en BotFather crea uno nuevo.</li>
<li>Cada destinatario necesita un <b>ID de chat</b>. <b>Persona:</b> abre el bot y pulsa <i>Iniciar</i> (<code>/start</code>), y después escribe a <b>@userinfobot</b>, que responde con su Id (un número). <b>Grupo o canal:</b> añade el bot (en un canal, como administrador) y publica un mensaje; el ID de chat empieza por <code>-</code> (p. ej. <code>-1001234567890</code>) y debe introducirse con el signo menos.</li>
<li>En «Destinatarios» añade una fila por cada uno, con una nota para recordar quién es. <b>Enviar mensaje de prueba</b> comprueba que llega a todos; si alguno falla, el error los enumera uno por uno. El campo del token tiene el mismo ojo de mostrar/ocultar que las contraseñas.</li></ol>
<p>Si el bot ya lo usan otros programas (por ejemplo, Home Assistant), puedes usarlo igualmente: G-Downloader solo envía mensajes y no molesta a los demás.</p>
<h3>12.3 Informe resumen</h3>
<p>En <i>Ajustes → Avisos → Informes y registros</i> puedes recibir un resumen por correo <b>diario</b> (últimas 24 horas) o <b>semanal</b> (lunes) a la hora elegida, con las descargas completadas/fallidas y el detalle de los errores. Usa la configuración de correo. Los días omitidos por una excepción de calendario no se cuentan como fallidos.</p>
""", False),
("Fiabilidad y comprobaciones", """
<p>En <i>Ajustes → Fiabilidad</i> y <i>Rendimiento y comprobaciones</i>:</p>
<ul>
<li><b>Archivo demasiado pequeño:</b> trata como error (y reintenta) un archivo descargado de menos del tamaño mínimo en KB; útil contra las páginas de error descargadas en lugar del archivo.</li>
<li><b>Archivo idéntico al anterior:</b> avisa si el archivo descargado es igual al anterior (puede que el contenido no se haya actualizado en el origen).</li>
<li><b>Aviso de «origen bloqueado»:</b> tras N descargas idénticas seguidas envía un aviso por correo/Telegram (0 = desactivado).</li>
<li><b>Programaciones omitidas:</b> al iniciar informa de las horas perdidas porque la app estaba apagada.</li>
<li><b>Descargas simultáneas:</b> límite máximo (0 = sin límite, 1 = de una en una); las descargas adicionales esperan.</li>
</ul>
<h3>13.1 Esperar un archivo publicado tarde</h3>
<p>Si el origen publica el archivo con retraso, activa <b>Esperando el archivo</b> en la tarjeta <i>Origen</i> de la tarea. Entonces la tarea lo intenta de nuevo cada N minutos (por defecto 1) durante un máximo de M minutos (por defecto 20) desde que empieza, en lugar de fallar al primer error. Por ejemplo: una tarea programada a las 19:55, que lo intenta cada minuto durante 20 minutos, cubre la ventana de las 19:55 a las 20:15.</p>
<ul>
<li>En cada intento se comprueba el archivo: un archivo <b>vacío o demasiado pequeño</b> (el mínimo se fija en la tarea; si se deja en 0 se usa el de Ajustes → Fiabilidad) y una <b>página web en lugar del archivo</b> (una página de error guardada con el nombre del archivo) cuentan como «todavía no ha llegado».</li>
<li>Para un <b>archivo local o de red</b>, la app espera además a que su tamaño deje de cambiar (por defecto 5 segundos entre dos lecturas), para no copiar un archivo que todavía se está escribiendo.</li>
<li>Un usuario o contraseña incorrectos (HTTP 401, FTP 530) detienen la espera de inmediato: esperar no serviría de nada.</li>
<li>Cuando termina la ventana, la tarea falla con el último error, el número de intentos y los minutos esperados, y se envía el aviso habitual.</li>
<li>Mientras espera, la tarea cuenta como en ejecución: la siguiente programación de la misma tarea se omite (con una advertencia en la consola) y, con «Descargas simultáneas» limitadas, ocupa un puesto; <i>Cerrar e instalar</i> se rechaza hasta que termina la espera.</li>
</ul>
""", False),
("Ajustes", """
<p>Las pestañas son, en este orden, las mismas en todas las apps de OnAir Garage:</p>
<table><tr><th>Pestaña</th><th>Contenido</th></tr>
<tr><td>General</td><td>tema claro/oscuro · idioma · formato de fecha y hora · <b>nombre de esta instalación</b> (se muestra en los avisos) · <b>uso desatendido</b>: iniciar al encender el equipo, iniciar minimizada, <b>mantener el equipo despierto</b>, icono de la barra de menús · notificaciones de éxito y de error · abrir la carpeta al pulsar la notificación · carpeta de destino por defecto · reintentos y espera por defecto</td></tr>
<tr><td>Fiabilidad</td><td>consulta el capítulo 13 (comprobaciones, rendimiento, espera del archivo)</td></tr>
<tr><td>Avisos</td><td>consulta el capítulo 12: informe por correo, correo y Telegram</td></tr>
<tr><td>Categorías</td><td>colores, <b>renombrar</b> (si el nombre ya existe, las dos categorías se fusionan y conservan el color de la existente) y <b>eliminar</b> (pregunta adónde van las tareas; las tareas no se borran nunca)</td></tr>
<tr><td>Actualizaciones</td><td>consulta el capítulo 16</td></tr>
<tr><td>Copia de seguridad</td><td>consulta el capítulo 15</td></tr>
<tr><td>Ayuda e información</td><td>abre la página <i>Ayuda e información</i>: versión, licencia, enlaces, privacidad, <b>Copiar info para asistencia</b> (versión, sistema, idioma, nombre de la instalación, última comprobación de actualizaciones y último error: nunca ajustes, direcciones, contraseñas ni nombres de archivo), <b>Abrir carpeta de registros</b>, la guía y una pequeña tarjeta con la hucha: pulsar la hucha o el botón abre la página de apoyo del sitio web en el idioma de la app (dentro de la app no se pide nunca nada)</td></tr></table>
<p>Cerrar la ventana mantiene la app en la bandeja (con un aviso solo la primera vez); iniciar la app una segunda vez muestra la ventana que ya está abierta; el tamaño y la posición de la ventana se recuerdan.</p>
<h3>Formato de fecha y hora</h3>
<p>El formato numérico (orden día/mes, 24 horas o AM/PM) se elige por separado del idioma: Automático, o 24h DD/MM/AAAA, AM/PM MM/DD/AAAA, ISO 24h AAAA-MM-DD, etc. En cambio, los <b>nombres</b> de los días y los meses siguen el idioma de la interfaz. Los campos de hora del editor de programaciones cambian de formato al reiniciar la app.</p>
""", True),
("Copia de seguridad, traslado y actualización", """
<h3>15.1 Exportar e importar</h3>
<ul><li><b>Copia de seguridad / traslado:</b> <i>Ajustes → Copia de seguridad → Exportar</i> guarda las tareas, los ajustes, las categorías y los colores en un archivo llamado <code>g-downloader-backup-AAAA-MM-DD.json</code>; <i>Importar</i> los restaura en otro equipo. El historial de ejecuciones, los registros y lo que ya dijeron los avisos no están nunca en el archivo.</li>
<li><b>Incluir contraseñas y tokens</b> está <b>desactivado</b> por defecto. Desactivado: el archivo no contiene ninguna contraseña, ningún token, ninguna credencial escrita en una dirección (<code>ftp://usuario:contraseña@host</code>) ni ninguna cabecera con una clave; tras la importación la app <b>enumera lo que hay que volver a escribir</b>. Activado: un aviso rojo indica que el archivo los contendrá en texto sin formato, y el archivo solo puede leerlo su propietario. Una contraseña guardada con la protección del sistema no se podría abrir en otro PC de todos modos, así que con la casilla activada se escribe en texto sin formato.</li>
<li><b>Importar</b> pregunta <i>Sustituir todo</i> (los ajustes y las tareas pasan a ser los del archivo; las tareas que ya están aquí conservan su historial) o <i>Añadir solo las tareas que faltan</i> (las tareas que este PC no tiene se añaden, desactivadas; los ajustes y las tareas existentes se quedan como están). Una contraseña que el archivo no contiene sigue siendo la de este PC, solo para el mismo servidor y usuario. La app comprueba que el archivo sea una copia de seguridad de G-Downloader y, si ejecuta programas tras una descarga, <b>los muestra y pregunta</b> antes de importar: importa solo archivos de confianza.</li>
<li><b>Una sola tarea:</b> <i>⤓ Exportar tarea</i> (en el editor) e <i>⤒ Importar</i> (barra lateral) sirven para compartir o duplicar una sola tarea: el archivo no contiene contraseñas, la tarea importada queda desactivada y la app enumera lo que hay que volver a escribir.</li></ul>
<div class="warn">Si marcas «Incluir contraseñas y tokens», guarda el archivo en un lugar seguro y no lo compartas.</div>
<h3>15.2 Actualizar desde una versión anterior</h3>
<ol><li>Exporta la configuración de la versión actual (por precaución).</li>
<li><b>Cierra la versión actual con «Salir»</b> en el menú del icono de la bandeja; si sigue activa, con la nueva abierta las descargas se ejecutarían dos veces.</li>
<li>Instala la versión nueva como se describe en el capítulo 3 o usa el flujo guiado del capítulo 16.</li>
<li>Iníciala y comprueba que las tareas y los ajustes están. Si faltan, usa <i>Importar configuración</i> con el archivo guardado en el paso 1.</li>
<li>Cuando hayas visto que una descarga se ejecuta correctamente, desinstala la versión antigua.</li></ol>
<div class="note">Como el identificador de la app ha cambiado (<code>com.onairgarage.gdownloader</code>), en Windows el instalador puede no sustituir la instalación anterior sino instalarse al lado: en ese caso desinstala la antigua tras comprobar la nueva.</div>
""", False),
("Actualizaciones", """
<p>G-Downloader comprueba periódicamente en GitHub si hay una versión más reciente (15 segundos después de iniciar y luego cada 24 horas) y muestra un aviso en la barra superior con las primeras líneas de las notas de la versión; el mismo aviso está disponible en <i>Ajustes → Actualizaciones</i>, que muestra además la fecha y el resultado de la <b>última comprobación</b> y tiene un botón <b>Comprobar ahora</b>. El aviso tiene cuatro botones: <b>Descargar e instalar</b>, <b>Recordármelo después</b> (lo oculta durante 24 horas), <b>Omitir esta versión</b> (lo oculta hasta que salga una más reciente) y <b>Notas de la versión</b> (abre la página de la app en onairgarage.com, donde están las notas y las descargas de la última versión).</p>
<h3>16.1 Descargar y verificar</h3>
<p>Al pulsar <b>Descargar e instalar</b>, la app averigua por sí sola el instalador correcto para tu sistema y procesador (Intel o Apple Silicon en Mac) y lo descarga en la carpeta <b>Descargas</b>, mostrando una barra de progreso con el porcentaje y los megabytes recibidos y un botón <b>Cancelar</b>. Una descarga cancelada, interrumpida o detenida no deja ningún archivo a medias. Al terminar compara el archivo con el <b>SHA-256</b> publicado en la versión (<code>SHA256SUMS.txt</code>): si no coincide, el archivo se <b>borra</b> y aparece un mensaje de error claro, con el botón <i>Abrir página de descarga</i> como alternativa.</p>
<p>El estado de la descarga (disponible, en curso, lista, error) es <b>el mismo</b> en la barra y en Ajustes: puedes iniciarla desde un sitio y seguirla desde el otro. Mientras se ejecuta una descarga, el botón <i>Buscar actualizaciones</i> permanece desactivado.</p>
<h3>16.2 Aviso también por correo y Telegram</h3>
<p>Para los equipos que se dejan solos en una sala de máquinas, cuando una comprobación automática encuentra una versión nueva, la app te lo dice <b>una vez por versión y por canal</b> (aviso de escritorio, Telegram, correo), con el número de versión y el enlace de la versión. Telegram y correo solo si están configurados; se puede desactivar en <i>Ajustes → Actualizaciones</i> («Avisarme también por correo/Telegram…»). Un canal cuenta como avisado solo después de que el mensaje se haya entregado: un envío fallido se vuelve a intentar en la siguiente comprobación, y lo que ya se avisó se recuerda entre reinicios (archivo <code>alert-state.json</code>). La comprobación manual no envía nunca mensajes.</p>
<h3>16.3 Terminar la instalación</h3>
<p>Una vez verificado, aparece un botón verde, distinto según el sistema:</p>
<table><tr><th>Sistema</th><th>Botón</th><th>Qué ocurre</th></tr>
<tr><td>Windows</td><td>Cerrar e instalar</td><td>la app se cierra sola (las descargas programadas se detienen) e inicia el instalador; se vuelve a abrir sola al terminar.</td></tr>
<tr><td>macOS</td><td>Abrir instalador</td><td>abre el archivo <code>.dmg</code> descargado. Sal de G-Downloader con «Salir» en el icono de la barra de menús y arrastra la versión nueva a Aplicaciones, igual que en la primera instalación.</td></tr>
<tr><td>Linux</td><td>Abrir instalador</td><td>muestra el archivo <code>.AppImage</code> descargado en su carpeta. Sal de G-Downloader con «Salir» e inicia el archivo nuevo.</td></tr></table>
<p><b>Antes de instalar</b>, la app hace una copia de seguridad de su archivo de datos en la carpeta <code>backups</code> (<code>pre-update-&lt;versión&gt;.json</code>, se conservan las últimas 3): no es una exportación y está pensada solo para este PC. Si hay descargas en curso, el botón se rechaza con el motivo: cerrar ahora las interrumpiría; inténtalo de nuevo cuando terminen.</p>
<h3>16.4 Tras la actualización</h3>
<p>En el primer inicio de la versión nueva, la app muestra <i>Actualizado a G-Downloader X</i> y una ventana <b>Novedades</b> con los puntos de esa versión, una sola vez.</p>
<div class="note">Nada se instala solo: el botón verde hay que pulsarlo siempre a propósito. En macOS y Linux la app no puede sustituirse a sí misma: el paso manual de arriba sigue siendo necesario, igual que en una primera instalación. En Windows el instalador vuelve a iniciar la versión nueva al final; esto está escrito en el instalador, pero aún no se ha comprobado en un PC Windows real.</div>
""", False),
("Registros e historial", """
<ul><li><b>Consola:</b> en tiempo real, en la parte inferior de la ventana (se borra al reiniciar).</li>
<li><b>Historial de las tareas:</b> los últimos 50 intentos de cada tarea, visibles en las tarjetas y en el panel.</li>
<li><b>Estadísticas diarias:</b> contadores permanentes (unos 13 meses) para los gráficos.</li>
<li><b>Archivos de registro:</b> un archivo por día, de 5 MB como máximo cada uno (un archivo lleno se cierra y empieza uno nuevo), se conservan los últimos 7 días, en la carpeta <code>logs</code> de los datos de la app (botón <i>Abrir carpeta de registros</i> en Ayuda e información). Cada línea lleva fecha, nivel, tarea y mensaje; las credenciales escritas dentro de las direcciones se ocultan.</li>
<li><b>Días omitidos:</b> un día omitido por una excepción de calendario se anota una vez por tarea en el historial como <i>omitido</i>; no cambia el último resultado y no se cuenta en las estadísticas.</li></ul>
""", False),
("Dónde están los datos", """
<table><tr><th>Sistema</th><th>Carpeta</th></tr>
<tr><td>Windows</td><td><code>%APPDATA%\\g-downloader</code></td></tr>
<tr><td>macOS</td><td><code>~/Library/Application Support/g-downloader</code></td></tr>
<tr><td>Linux</td><td><code>~/.config/g-downloader</code></td></tr></table>
<p>Contiene el archivo de tareas y ajustes, <code>alert-state.json</code> (lo que los avisos ya dijeron), la carpeta <code>backups</code> (copias de seguridad hechas antes de una actualización) y la carpeta <code>logs</code>. Las contraseñas, los tokens y las credenciales escritas dentro de las direcciones se guardan cifrados con el sistema de protección del equipo y del usuario: no se pueden leer si copias los datos a otro PC (en ese caso hay que volver a introducirlas; para eso existe la casilla «Incluir contraseñas y tokens» de Copia de seguridad).</p>
""", False),
("Solución de problemas", """
<table><tr><th>Problema</th><th>Qué hacer</th></tr>
<tr><td>macOS: «la app está dañada / no se puede abrir»</td><td>Abre <i>Ajustes del Sistema → Privacidad y seguridad → Abrir de todos modos</i>; para una versión anterior a la 26.10.4, <code>xattr -cr /Applications/G-Downloader.app &amp;&amp; codesign --force --deep -s - /Applications/G-Downloader.app</code>.</td></tr>
<tr><td>Windows: «Windows protegió su PC»</td><td>Más información → Ejecutar de todos modos.</td></tr>
<tr><td>Linux: el AppImage no se inicia</td><td>Hazlo ejecutable (<code>chmod +x</code>) e instala FUSE (<code>libfuse2</code>) si hace falta.</td></tr>
<tr><td>La descarga no empieza a la hora programada</td><td>Comprueba que la app está en marcha (icono de la bandeja), que la tarea y la programación están activadas, y mira la <i>Vista previa</i> y la consola. Activa el aviso de programaciones omitidas.</td></tr>
<tr><td>Error 401/403 del servidor</td><td>Comprueba el usuario y la contraseña en la tarjeta Origen.</td></tr>
<tr><td>«Ningún archivo nuevo: el último que coincide…»</td><td>Un nombre con <code>*</code> solo encontró el archivo tomado la vez anterior: el nuevo aún no se ha publicado. No hay nada que corregir: la ventana de espera y los reintentos siguen. «Ningún archivo coincide» significa que la carpeta no contiene nada con ese patrón: revisa el patrón y la carpeta.</td></tr>
<tr><td>FTP: «550 file not found»</td><td>Lee el mensaje: muestra la carpeta de inicio de sesión y los archivos presentes; corrige la ruta o espera a que se publique el archivo. Recuerda la barra doble para las rutas absolutas.</td></tr>
<tr><td>El archivo descargado es una página de error, o el archivo se publica tarde</td><td>Activa «Esperando el archivo» en la tarea (capítulo 13.1): los archivos vacíos, los demasiado pequeños y las páginas web se reintentan hasta que termina la ventana. O activa «Comprobar que el archivo descargado no sea demasiado pequeño» en Ajustes.</td></tr>
<tr><td>Una descarga no se ejecutó en un festivo</td><td>Mira las <i>Excepciones de calendario</i> de la tarea (capítulo 8.6) y la nota <i>omitido (excepción)</i> en la actividad reciente.</td></tr>
<tr><td>Las contraseñas han desaparecido tras un traslado</td><td>Están ligadas al usuario y al equipo: vuelve a introducirlas.</td></tr>
<tr><td>No llegan los correos/Telegram</td><td>Usa los botones de prueba de Ajustes y comprueba el mensaje de error.</td></tr>
<tr><td>Las descargas se ejecutan dos veces</td><td>Probablemente hay dos copias de la app abiertas (la antigua y la nueva): cierra la que no necesites con «Salir».</td></tr>
<tr><td>«Update download failed: checksum mismatch»</td><td>El archivo descargado se borró automáticamente. Inténtalo de nuevo (quizá con otra conexión) o descarga el instalador a mano desde la página de versiones.</td></tr></table>
<h3>Contactos e información</h3>
<p>Graziano Melzi · OnAir Garage — <code>https://onairgarage.com</code> — <code>hello@onairgarage.com</code><br>Código fuente y versiones: <code>https://github.com/djgragra/g-downloader</code><br>Licencia: MIT © 2026 Graziano Melzi.</p>
""", False),
])
