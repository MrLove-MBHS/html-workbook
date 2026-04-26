document.addEventListener('DOMContentLoaded', function () {
    const runButton = document.getElementById('runButton');
    const codeInput = document.getElementById('codeInput');
    const outputWindow = document.getElementById('outputWindow');
    const createFileButton = document.getElementById('createFileButton');
    const fileNameInput = document.getElementById('fileName');
    const fileList = document.getElementById('fileList');
    const imageInput = document.getElementById('imageInput');
    const addImageButton = document.getElementById('addImageButton');
    const imageList = document.getElementById('imageList');
    const resetButton = document.getElementById('resetButton');
    const sidebar = document.querySelector('aside');
    const container = document.querySelector('.container');
    const toggleSidebarButton = document.getElementById('toggleSidebar');

    let files = JSON.parse(localStorage.getItem('files')) || {
        'index.html': '',
        'style.css': '/* Add your CSS here */'
    };

    let images = JSON.parse(localStorage.getItem('images')) || {};

    function setEditorState(enabled, fileName = '') {
        codeInput.disabled = !enabled;
        if (!enabled) {
            codeInput.value = '';
            codeInput.placeholder = 'Select a file to start editing...';
        } else {
            codeInput.placeholder = `Write your code for ${fileName} here...`;
        }
    }

    function refreshFileList() {
        fileList.innerHTML = '';
        Object.keys(files).forEach(addFileToList);

        // Always select index.html if it exists, or the first file, otherwise disable editor
        let toSelect = null;
        if (files['index.html']) {
            toSelect = Array.from(fileList.children).find(
                item => item.textContent.startsWith('index.html')
            );
        }
        if (!toSelect && fileList.firstChild) {
            toSelect = fileList.firstChild;
        }

        if (toSelect) {
            highlightSelectedFile(toSelect);
            const fileName = toSelect.textContent.replace('🗑️','').trim();
            codeInput.value = files[fileName];
            setEditorState(true, fileName);
        } else {
            setEditorState(false);
            outputWindow.srcdoc = '';
        }
    }

    function refreshImageList() {
        imageList.innerHTML = '';
        Object.keys(images).forEach(addImageToList);
    }

    function addFileToList(fileName) {
        const listItem = document.createElement('li');
        listItem.textContent = fileName;

        // Add delete button if not index.html
        if (fileName !== 'index.html') {
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = "🗑️";
            deleteBtn.style.marginLeft = "8px";
            deleteBtn.style.background = "transparent";
            deleteBtn.style.border = "none";
            deleteBtn.style.cursor = "pointer";
            deleteBtn.style.fontSize = "16px";
            deleteBtn.title = "Delete file";
            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if(confirm(`Delete "${fileName}"? This cannot be undone.`)) {
                    delete files[fileName];
                    localStorage.setItem('files', JSON.stringify(files));
                    refreshFileList();
                }
            });
            listItem.appendChild(deleteBtn);
        }

        listItem.addEventListener('click', function() {
            const prevSelected = fileList.querySelector('.selected-file');
            if (prevSelected) {
                const prevFile = prevSelected.textContent.replace('🗑️','').trim();
                files[prevFile] = codeInput.value;
                localStorage.setItem('files', JSON.stringify(files));
            }
            codeInput.value = files[fileName];
            highlightSelectedFile(listItem);
            setEditorState(true, fileName);
        });

        fileList.appendChild(listItem);
    }

    function highlightSelectedFile(selectedItem) {
        const items = fileList.querySelectorAll('li');
        items.forEach(item => item.classList.remove('selected-file'));
        selectedItem.classList.add('selected-file');
    }

    function addImageToList(imageName) {
        const listItem = document.createElement('li');
        listItem.textContent = imageName;

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "🗑️";
        deleteBtn.style.marginLeft = "8px";
        deleteBtn.style.background = "transparent";
        deleteBtn.style.border = "none";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.fontSize = "16px";
        deleteBtn.title = "Delete image";
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if(confirm(`Delete image "${imageName}"?`)) {
                delete images[imageName];
                localStorage.setItem('images', JSON.stringify(images));
                refreshImageList();
            }
        });

        listItem.appendChild(deleteBtn);
        imageList.appendChild(listItem);
    }

    refreshFileList();
    refreshImageList();

    runButton.addEventListener('click', function () {
        if (codeInput.disabled) {
            outputWindow.srcdoc = '';
            return;
        }
        const code = codeInput.value;
        const selectedItem = fileList.querySelector('.selected-file');
        const fileName = selectedItem ? selectedItem.textContent.replace('🗑️','').trim() : null;
        if (fileName && files[fileName] !== undefined) {
            files[fileName] = code;
            localStorage.setItem('files', JSON.stringify(files));
            if (fileName.endsWith('.html')) {
                const doc = new DOMParser().parseFromString(code, 'text/html');
                const styleLink = doc.querySelector('link[rel="stylesheet"]');
                if (styleLink && styleLink.getAttribute('href') === 'css/style.css') {
                    const style = doc.createElement('style');
                    style.textContent = files['style.css'] || '';
                    doc.head.appendChild(style);
                }
                outputWindow.srcdoc = doc.documentElement.outerHTML;
            } else {
                outputWindow.srcdoc = code;
            }
            setTimeout(interceptLinks, 100);
        } else {
            outputWindow.srcdoc = '';
        }
    });

    createFileButton.addEventListener('click', function () {
        const fileName = fileNameInput.value.trim();
        if (fileName && !files[fileName]) {
            files[fileName] = '';
            localStorage.setItem('files', JSON.stringify(files));
            refreshFileList();
            fileNameInput.value = '';
        }
    });

    addImageButton.addEventListener('click', function () {
        const file = imageInput.files[0];
        if (file) {
            const imageName = file.name;
            const reader = new FileReader();
            reader.onload = function (event) {
                images[imageName] = event.target.result;
                localStorage.setItem('images', JSON.stringify(images));
                refreshImageList();
                alert(`Image ${imageName} added. You can use it with <img src="${imageName}">`);
            };
            reader.readAsDataURL(file);
        }
    });

    resetButton.addEventListener('click', function () {
        if (confirm('Are you sure you want to reset the playground? This will clear all your files and images.')) {
            localStorage.clear();
            location.reload();
        }
    });

    codeInput.addEventListener('input', function () {
        if (codeInput.disabled) return;
        const selectedItem = fileList.querySelector('.selected-file');
        const fileName = selectedItem ? selectedItem.textContent.replace('🗑️','').trim() : null;
        if (fileName && files[fileName] !== undefined) {
            files[fileName] = codeInput.value;
            localStorage.setItem('files', JSON.stringify(files));
        }
    });

    function interceptLinks() {
        const iframeDocument = outputWindow.contentDocument || outputWindow.contentWindow.document;
        const links = iframeDocument.querySelectorAll('a');
        links.forEach(link => {
            link.addEventListener('click', function (event) {
                event.preventDefault();
                const href = link.getAttribute('href');
                if (files[href]) {
                    codeInput.value = files[href];
                    highlightSelectedFile([...fileList.children].find(item => item.textContent.startsWith(href)));
                    setEditorState(true, href);
                    outputWindow.srcdoc = files[href];
                    setTimeout(interceptLinks, 100);
                }
            });
        });
        const imgs = iframeDocument.querySelectorAll('img');
        imgs.forEach(img => {
            const src = img.getAttribute('src');
            if (images[src]) {
                img.src = images[src];
            }
        });
    }

    toggleSidebarButton.addEventListener('click', function () {
        sidebar.classList.toggle('closed');
        container.classList.toggle('sidebar-closed');
    });
});
