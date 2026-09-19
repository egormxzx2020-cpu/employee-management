import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class Server {
    private static final File XML_FILE = new File("data/data.xml");

    public static void main(String[] args) throws Exception {
        // Создаем папку data и файл data.xml, если их еще нет
        if (!XML_FILE.exists()) {
            XML_FILE.getParentFile().mkdirs();
            try (FileWriter writer = new FileWriter(XML_FILE, StandardCharsets.UTF_8)) {
                writer.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<employees>\n</employees>");
            }
        }

        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/api/employees", new EmployeesHandler());
        server.setExecutor(null);
        System.out.println("Java-сервер запущен: http://localhost:8080/api/employees");
        server.start();
    }

    static class EmployeesHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            // Разрешаем CORS-запросы из браузера
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");

            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            try {
                if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                    // Отдаем текущее содержимое data.xml
                    byte[] bytes = java.nio.file.Files.readAllBytes(XML_FILE.toPath());
                    exchange.getResponseHeaders().set("Content-Type", "application/xml; charset=UTF-8");
                    exchange.sendResponseHeaders(200, bytes.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(bytes);
                    }
                } else if ("POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                    // Перезаписываем data.xml присланными данными
                    InputStream is = exchange.getRequestBody();
                    String xmlContent = new String(is.readAllBytes(), StandardCharsets.UTF_8);

                    try (FileWriter writer = new FileWriter(XML_FILE, StandardCharsets.UTF_8)) {
                        writer.write(xmlContent);
                    }

                    byte[] resp = "OK".getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(200, resp.length);
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(resp);
                    }
                }
            } catch (Exception e) {
                e.printStackTrace();
                exchange.sendResponseHeaders(500, -1);
            }
        }
    }
}