const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateInvoice(ticketData) {
    const invoicesDir = path.join(__dirname, 'invoices');
    if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir); // Create the invoices directory if it doesn't exist
    }

    const fileName = `invoice_${ticketData.ticket_id}_${Date.now()}.pdf`;
    const filePath = path.join(invoicesDir, fileName);

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Add header
        doc.fontSize(25).text('JourneySphere Travel Co.', { align: 'center' });
        doc.moveDown();
        doc.fontSize(20).text('Travel Ticket Invoice', { align: 'center' });

        // Add ticket details
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Invoice Date: ${new Date().toLocaleDateString()}`);
        doc.text(`Ticket ID: ${ticketData.ticket_id}`);
        doc.text(`From: ${ticketData.fr_}`);
        doc.text(`To: ${ticketData.to_}`);
        doc.text(`Mode: ${ticketData.mode_}`);
        doc.text(`Duration: ${ticketData.duration}`);
        doc.text(`Price: ₹${ticketData.price}`);
        doc.text(`Rating: ${ticketData.rating}`);
        doc.text(`Review: ${ticketData.review}`);

        // Add footer
        doc.moveDown();
        doc.fontSize(10).text('Thank you for choosing JourneySphere Travel Co.', { align: 'center' });

        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', (err) => reject(err));
    });
}

module.exports = { generateInvoice };