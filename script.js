

const state = {
    editor: null,
    settings: {
        filename: 'document',
        font: 'helvetica',
        fontSize: 12,
        pageSize: 'a4',
        orientation: 'portrait',
        headerText: '',
        pageNumbers: false,
        lineNumbers: false
    },
    stats: {
        chars: 0,
        words: 0,
        lines: 0
    }
};



document.addEventListener('DOMContentLoaded', () => {
    initializeElements();
    attachEventListeners();
    updateStats();
});

function initializeElements() {
    state.editor = document.getElementById('editor');
}



function attachEventListeners() {

    state.editor.addEventListener('input', handleEditorInput);


    document.getElementById('filename').addEventListener('input', updateSettings);
    document.getElementById('font').addEventListener('change', updateSettings);
    document.getElementById('fontSize').addEventListener('change', updateSettings);
    document.getElementById('pageSize').addEventListener('change', updateSettings);
    document.getElementById('orientation').addEventListener('change', updateSettings);
    document.getElementById('headerText').addEventListener('input', updateSettings);
    document.getElementById('pageNumbers').addEventListener('change', updateSettings);
    document.getElementById('lineNumbers').addEventListener('change', updateSettings);


    document.getElementById('fileInput').addEventListener('change', handleFileUpload);


    document.getElementById('previewBtn').addEventListener('click', handlePreview);
    document.getElementById('downloadBtn').addEventListener('click', handleDownload);


    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('previewModal').addEventListener('click', (e) => {
        if (e.target.id === 'previewModal') closeModal();
    });
}



function handleEditorInput() {
    updateStats();
}

function updateStats() {
    const text = state.editor.value;


    state.stats.chars = text.length;


    state.stats.words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;


    state.stats.lines = text === '' ? 0 : text.split('\n').length;


    document.getElementById('charCount').textContent = state.stats.chars;
    document.getElementById('wordCount').textContent = state.stats.words;
    document.getElementById('lineCount').textContent = state.stats.lines;
}



function updateSettings() {
    state.settings.filename = document.getElementById('filename').value || 'document';
    state.settings.font = document.getElementById('font').value;
    state.settings.fontSize = document.getElementById('fontSize').value;
    state.settings.pageSize = document.getElementById('pageSize').value;
    state.settings.orientation = document.getElementById('orientation').value;
    state.settings.headerText = document.getElementById('headerText').value;
    state.settings.pageNumbers = document.getElementById('pageNumbers').checked;
    state.settings.lineNumbers = document.getElementById('lineNumbers').checked;
}



function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        state.editor.value = e.target.result;
        updateStats();


        if (document.getElementById('filename').value === 'document') {
            const name = file.name.replace(/\.[^/.]+$/, "");
            document.getElementById('filename').value = name;
            updateSettings();
        }
    };
    reader.readAsText(file);
}



function getPageDimensions() {
    const { pageSize, orientation } = state.settings;

    const sizes = {
        a4: { width: 210, height: 297 },
        letter: { width: 215.9, height: 279.4 },
        legal: { width: 215.9, height: 355.6 }
    };

    const dim = sizes[pageSize];

    if (orientation === 'landscape') {
        return { width: dim.height, height: dim.width };
    }

    return dim;
}

function processContent() {
    return { type: 'text', content: state.editor.value };
}

async function generatePDF() {
    updateSettings();

    const { jsPDF } = window.jspdf;
    const dimensions = getPageDimensions();
    const doc = new jsPDF({
        orientation: state.settings.orientation,
        unit: 'mm',
        format: [dimensions.width, dimensions.height]
    });

    const margin = 20;
    const maxWidth = dimensions.width - (margin * 2);
    let yPosition = margin;


    if (state.settings.headerText) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(state.settings.headerText, margin, yPosition);
        yPosition += 10;
        doc.line(margin, yPosition, dimensions.width - margin, yPosition);
        yPosition += 10;
    }


    doc.setFont(state.settings.font);
    doc.setFontSize(state.settings.fontSize);
    doc.setTextColor(0, 0, 0);

    const processed = processContent();


    const lines = doc.splitTextToSize(processed.content, maxWidth);

    lines.forEach((line, index) => {

        if (yPosition > dimensions.height - margin) {
            doc.addPage();
            yPosition = margin;
        }


        if (state.settings.lineNumbers) {
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(8);
            doc.text(`${index + 1}`, margin - 5, yPosition, { align: 'right' });
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(state.settings.fontSize);
        }

        doc.text(line, margin, yPosition);
        yPosition += state.settings.fontSize * 0.5;
    });

    addPageNumbers(doc);
    return Promise.resolve(doc);
}

function addPageNumbers(doc) {
    if (!state.settings.pageNumbers) return;

    const pageCount = doc.internal.getNumberOfPages();
    const dimensions = getPageDimensions();

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(
            `Page ${i} of ${pageCount}`,
            dimensions.width / 2,
            dimensions.height - 10,
            { align: 'center' }
        );
    }
}



async function handlePreview() {
    try {
        const doc = await generatePDF();
        const pdfDataUri = doc.output('dataurlstring');

        document.getElementById('previewFrame').src = pdfDataUri;
        openModal();
    } catch (error) {
        console.error('Preview error:', error);
        alert('Error generating preview. Please check your content and try again.');
    }
}

async function handleDownload() {
    try {
        const doc = await generatePDF();
        const filename = `${state.settings.filename}.pdf`;
        doc.save(filename);
    } catch (error) {
        console.error('Download error:', error);
        alert('Error generating PDF. Please check your content and try again.');
    }
}



function openModal() {
    document.getElementById('previewModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('previewModal').classList.remove('active');
    document.body.style.overflow = '';
}


document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});




window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});


window.addEventListener('beforeunload', (e) => {
    if (state.editor.value.trim().length > 0) {
        e.preventDefault();
        e.returnValue = '';
    }
});
