import { jsPDF } from "jspdf";

export const generateTypingPDF = (result, options = {}) => {
    const { showSignature = false } = options;

    if (!result) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const submittedTime = new Date(result.submittedAt).toLocaleString();

    // ================= HEADER AREA =================
    doc.setFillColor(240, 245, 255);
    doc.rect(0, 0, pageWidth, 40, "F");

    doc.setFontSize(15);
    doc.text("Typing Test Report", pageWidth / 2, 12, { align: "center" });

    // ---- HEADER TABLE ----
    const headers = [
        "Candidate ID",
        "Candidate Name",
        "Time",
        "Session",
        "WPM",
        "Post Applied",
        "Key Depressions",
    ];

    const keyDepressions =
        result.seconds > 0
            ? Math.round((result.symbols / result.seconds) * 3600)
            : 0;

    const formatTime = (seconds) => {
        if (!seconds || seconds <= 0) return "0 min";
        const mins = Math.ceil(seconds / 60);  // round up
        return `${mins} min`;
    };

    const values = [
        result.studentId || "N/A",
        result.name || "N/A",
        `${formatTime(result.seconds)}`,
        result.sessionName || "N/A",
        result.wpm || "N/A",
        result.postApplied || "N/A",
        keyDepressions,
    ];

    doc.setFontSize(9);

    const startX = 10;
    const colWidth = (pageWidth - 20) / headers.length;

    headers.forEach((header, i) => {
        doc.text(header, startX + i * colWidth, 24);
    });

    values.forEach((value, i) => {
        doc.text(String(value), startX + i * colWidth, 32);
    });

    // ================= CONTENT =================
    doc.setFontSize(14);
    doc.text("Typed Paragraph", 14, 50);

    let y = 60;
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(result.text || "", 180);

    lines.forEach((line) => {
        if (y > pageHeight - 40) {
            doc.addPage();
            y = 20;
        }
        doc.text(line, 14, y);
        y += 7;
    });

    const totalPages = doc.getNumberOfPages();

    // ================= OPTIONAL SIGNATURE =================
    if (showSignature) {
        doc.setPage(totalPages);

        const signatureY = pageHeight - 35;

        doc.setFontSize(11);

        const nameText = `Candidate Name: ${result.name || "N/A"}`;
        const wrappedName = doc.splitTextToSize(nameText, pageWidth - 100);

        doc.text(wrappedName, 14, signatureY);

        doc.line(
            pageWidth - 80,
            signatureY,
            pageWidth - 20,
            signatureY
        );
        doc.text("Signature", pageWidth - 80, signatureY + 6);
    }

    // ================= FOOTER =================
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);

        doc.text(
            `Submitted: ${submittedTime}`,
            14,
            pageHeight - 10
        );

        doc.text(
            `${i}/${totalPages}`,
            pageWidth - 14,
            pageHeight - 10,
            { align: "right" }
        );
    }

    const blob = doc.output("blob");
    const url = URL.createObjectURL(blob);
    window.open(url);
};