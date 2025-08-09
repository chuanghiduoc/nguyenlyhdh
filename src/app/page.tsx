"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Play } from "lucide-react";

interface Process {
  id: string;
  name: string;
  arrivalTime: number;
  burstTime: number;
}

interface SchedulingResult {
  process: Process;
  startTime: number;
  endTime: number;
  turnaroundTime: number;
  waitingTime: number;
}

interface GanttItem {
  processName: string;
  startTime: number;
  endTime: number;
  color: string;
}

export default function Home() {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [inputData, setInputData] = useState<string>("");
  const [algorithm, setAlgorithm] = useState<string>("fcfs");
  const [timeQuantum, setTimeQuantum] = useState<string>("2");
  const [results, setResults] = useState<SchedulingResult[]>([]);
  const [ganttChart, setGanttChart] = useState<GanttItem[]>([]);

  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
    "#F8C471",
    "#82E0AA",
  ];

  const parseInputData = () => {
    try {
      const data = inputData.trim().split(/\s+/);
      if (data.length % 2 !== 0) {
        alert(
          "Dữ liệu nhập không hợp lệ! Phải theo định dạng: thời_điểm_xuất_hiện thời_gian_CPU (lặp lại cho mỗi tiến trình)"
        );
        return;
      }

      const newProcesses: Process[] = [];
      for (let i = 0; i < data.length; i += 2) {
        const arrivalTime = parseInt(data[i]);
        const burstTime = parseInt(data[i + 1]);
        const processNumber = i / 2 + 1;
        const name = `P${processNumber}`;

        if (isNaN(arrivalTime) || isNaN(burstTime)) {
          alert(
            `Dữ liệu không hợp lệ cho tiến trình ${name}. Thời điểm xuất hiện và thời gian CPU phải là số.`
          );
          return;
        }

        newProcesses.push({
          id: `${Date.now()}-${i}`,
          name,
          arrivalTime,
          burstTime,
        });
      }

      setProcesses(newProcesses);
      setResults([]);
      setGanttChart([]);
    } catch (error) {
      alert("Có lỗi khi phân tích dữ liệu nhập!");
    }
  };

  const removeProcess = (id: string) => {
    setProcesses(processes.filter((p) => p.id !== id));
  };

  const fcfsScheduling = (
    processes: Process[]
  ): { results: SchedulingResult[]; gantt: GanttItem[] } => {
    const sortedProcesses = [...processes].sort(
      (a, b) => a.arrivalTime - b.arrivalTime
    );
    const results: SchedulingResult[] = [];
    const gantt: GanttItem[] = [];
    let currentTime = 0;

    sortedProcesses.forEach((process, index) => {
      const startTime = Math.max(currentTime, process.arrivalTime);
      const endTime = startTime + process.burstTime;
      const turnaroundTime = endTime - process.arrivalTime;
      const waitingTime = turnaroundTime - process.burstTime;

      results.push({
        process,
        startTime,
        endTime,
        turnaroundTime,
        waitingTime,
      });

      gantt.push({
        processName: process.name,
        startTime,
        endTime,
        color: colors[index % colors.length],
      });

      currentTime = endTime;
    });

    return { results, gantt };
  };

  const sjfScheduling = (
    processes: Process[]
  ): { results: SchedulingResult[]; gantt: GanttItem[] } => {
    const results: SchedulingResult[] = [];
    const gantt: GanttItem[] = [];
    let currentTime = 0;
    let remainingProcesses = [...processes];
    let colorIndex = 0;

    while (remainingProcesses.length > 0) {
      const availableProcesses = remainingProcesses.filter(
        (p) => p.arrivalTime <= currentTime
      );

      if (availableProcesses.length === 0) {
        currentTime = Math.min(...remainingProcesses.map((p) => p.arrivalTime));
        continue;
      }

      const shortestProcess = availableProcesses.reduce((shortest, current) =>
        current.burstTime < shortest.burstTime ? current : shortest
      );

      const startTime = currentTime;
      const endTime = startTime + shortestProcess.burstTime;
      const turnaroundTime = endTime - shortestProcess.arrivalTime;
      const waitingTime = turnaroundTime - shortestProcess.burstTime;

      results.push({
        process: shortestProcess,
        startTime,
        endTime,
        turnaroundTime,
        waitingTime,
      });

      gantt.push({
        processName: shortestProcess.name,
        startTime,
        endTime,
        color: colors[colorIndex % colors.length],
      });

      currentTime = endTime;
      remainingProcesses = remainingProcesses.filter(
        (p) => p.id !== shortestProcess.id
      );
      colorIndex++;
    }

    return { results, gantt };
  };

  const roundRobinScheduling = (
    processes: Process[],
    quantum: number
  ): { results: SchedulingResult[]; gantt: GanttItem[] } => {
    const results: SchedulingResult[] = [];
    const gantt: GanttItem[] = [];
    let currentTime = 0;

    const processQueue = [...processes].sort(
      (a, b) => a.arrivalTime - b.arrivalTime
    );
    const remainingTime = new Map(processes.map((p) => [p.id, p.burstTime]));
    const completionTime = new Map<string, number>();
    const processColors = new Map(
      processes.map((p, i) => [p.id, colors[i % colors.length]])
    );

    const queue: Process[] = [];
    let processIndex = 0;

    while (queue.length > 0 || processIndex < processQueue.length) {
      // Add newly arrived processes to queue
      while (
        processIndex < processQueue.length &&
        processQueue[processIndex].arrivalTime <= currentTime
      ) {
        queue.push(processQueue[processIndex]);
        processIndex++;
      }

      if (queue.length === 0) {
        currentTime = processQueue[processIndex].arrivalTime;
        continue;
      }

      const currentProcess = queue.shift()!;
      const remainingBurst = remainingTime.get(currentProcess.id)!;
      const executionTime = Math.min(quantum, remainingBurst);

      gantt.push({
        processName: currentProcess.name,
        startTime: currentTime,
        endTime: currentTime + executionTime,
        color: processColors.get(currentProcess.id)!,
      });

      currentTime += executionTime;
      remainingTime.set(currentProcess.id, remainingBurst - executionTime);

      // Add newly arrived processes
      while (
        processIndex < processQueue.length &&
        processQueue[processIndex].arrivalTime <= currentTime
      ) {
        queue.push(processQueue[processIndex]);
        processIndex++;
      }

      if (remainingTime.get(currentProcess.id)! > 0) {
        queue.push(currentProcess);
      } else {
        completionTime.set(currentProcess.id, currentTime);
      }
    }

    // Calculate results
    processes.forEach((process) => {
      const endTime = completionTime.get(process.id)!;
      const turnaroundTime = endTime - process.arrivalTime;
      const waitingTime = turnaroundTime - process.burstTime;

      results.push({
        process,
        startTime: process.arrivalTime,
        endTime,
        turnaroundTime,
        waitingTime,
      });
    });

    return { results, gantt };
  };

  const srtnScheduling = (
    processes: Process[]
  ): { results: SchedulingResult[]; gantt: GanttItem[] } => {
    const results: SchedulingResult[] = [];
    const gantt: GanttItem[] = [];
    let currentTime = 0;

    const remainingTime = new Map(processes.map((p) => [p.id, p.burstTime]));
    const completionTime = new Map<string, number>();
    const processColors = new Map(
      processes.map((p, i) => [p.id, colors[i % colors.length]])
    );

    let lastProcess: Process | null = null;
    let segmentStart = 0;

    while (completionTime.size < processes.length) {
      const availableProcesses = processes.filter(
        (p) => p.arrivalTime <= currentTime && remainingTime.get(p.id)! > 0
      );

      if (availableProcesses.length === 0) {
        currentTime++;
        continue;
      }

      const shortestProcess = availableProcesses.reduce((shortest, current) =>
        remainingTime.get(current.id)! < remainingTime.get(shortest.id)!
          ? current
          : shortest
      );

      if (lastProcess && lastProcess.id !== shortestProcess.id) {
        gantt.push({
          processName: lastProcess.name,
          startTime: segmentStart,
          endTime: currentTime,
          color: processColors.get(lastProcess.id)!,
        });
        segmentStart = currentTime;
      } else if (!lastProcess) {
        segmentStart = currentTime;
      }

      remainingTime.set(
        shortestProcess.id,
        remainingTime.get(shortestProcess.id)! - 1
      );
      currentTime++;

      if (remainingTime.get(shortestProcess.id)! === 0) {
        completionTime.set(shortestProcess.id, currentTime);
        gantt.push({
          processName: shortestProcess.name,
          startTime: segmentStart,
          endTime: currentTime,
          color: processColors.get(shortestProcess.id)!,
        });
        lastProcess = null;
      } else {
        lastProcess = shortestProcess;
      }
    }

    // Calculate results
    processes.forEach((process) => {
      const endTime = completionTime.get(process.id)!;
      const turnaroundTime = endTime - process.arrivalTime;
      const waitingTime = turnaroundTime - process.burstTime;

      results.push({
        process,
        startTime: process.arrivalTime,
        endTime,
        turnaroundTime,
        waitingTime,
      });
    });

    return { results, gantt };
  };

  const runScheduling = () => {
    if (processes.length === 0) return;

    let schedulingResult;

    switch (algorithm) {
      case "fcfs":
        schedulingResult = fcfsScheduling(processes);
        break;
      case "sjf":
        schedulingResult = sjfScheduling(processes);
        break;
      case "rr":
        schedulingResult = roundRobinScheduling(
          processes,
          parseInt(timeQuantum)
        );
        break;
      case "srtn":
        schedulingResult = srtnScheduling(processes);
        break;
      default:
        schedulingResult = fcfsScheduling(processes);
    }

    setResults(schedulingResult.results);
    setGanttChart(schedulingResult.gantt);
  };

  const averageWaitingTime =
    results.length > 0
      ? (
          results.reduce((sum, r) => sum + r.waitingTime, 0) / results.length
        ).toFixed(2)
      : "0";

  const averageTurnaroundTime =
    results.length > 0
      ? (
          results.reduce((sum, r) => sum + r.turnaroundTime, 0) / results.length
        ).toFixed(2)
      : "0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Mô phỏng thuật toán điều độ CPU
          </h1>
          <p className="text-gray-600">
            FCFS, Round Robin, SJF, SRTN với biểu đồ Gantt và phân tích kết quả
          </p>
        </div>

        {/* Process Input */}
        <Card>
          <CardHeader>
            <CardTitle>Nhập thông tin tiến trình</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="inputData">
                  Nhập dữ liệu tiến trình (định dạng: thời_điểm_xuất_hiện
                  thời_gian_CPU)
                </Label>
                <Input
                  id="inputData"
                  placeholder="Ví dụ: 0 10 1 2 2 5"
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Định dạng: thời_điểm_xuất_hiện thời_gian_CPU (cách nhau bằng
                  dấu cách)
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Ví dụ: &quot;0 10 1 2 2 5&quot; sẽ tạo P1 (xuất hiện lúc 0,
                  dùng CPU 10 đơn vị), P2 (xuất hiện lúc 1, dùng CPU 2 đơn vị),
                  P3 (xuất hiện lúc 2, dùng CPU 5 đơn vị). Tên tiến trình sẽ tự
                  động là P1, P2, P3...
                </p>
              </div>
              <div className="flex gap-2">
                <Button onClick={parseInputData} className="flex-1">
                  <Plus className="w-4 h-4 mr-2" />
                  Phân tích dữ liệu
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setProcesses([]);
                    setInputData("");
                    setResults([]);
                    setGanttChart([]);
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa tất cả
                </Button>
              </div>
            </div>

            {processes.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Danh sách tiến trình:</h3>
                <div className="flex flex-wrap gap-2">
                  {processes.map((process) => (
                    <Badge
                      key={process.id}
                      variant="secondary"
                      className="px-3 py-1"
                    >
                      {process.name} (AT: {process.arrivalTime}, BT:{" "}
                      {process.burstTime})
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2 h-4 w-4 p-0"
                        onClick={() => removeProcess(process.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Algorithm Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Chọn thuật toán điều độ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={algorithm} onValueChange={setAlgorithm}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fcfs" id="fcfs" />
                  <Label htmlFor="fcfs" className="font-medium">
                    FCFS (First Come First Served)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sjf" id="sjf" />
                  <Label htmlFor="sjf" className="font-medium">
                    SJF (Shortest Job First)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rr" id="rr" />
                  <Label htmlFor="rr" className="font-medium">
                    RR (Round Robin)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="srtn" id="srtn" />
                  <Label htmlFor="srtn" className="font-medium">
                    SRTN (Shortest Remaining Time Next)
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {algorithm === "rr" && (
              <div className="w-48">
                <Label htmlFor="timeQuantum">Time Quantum</Label>
                <Input
                  id="timeQuantum"
                  type="number"
                  value={timeQuantum}
                  onChange={(e) => setTimeQuantum(e.target.value)}
                />
              </div>
            )}

            <Button
              onClick={runScheduling}
              disabled={processes.length === 0}
              className="w-full"
            >
              <Play className="w-4 h-4 mr-2" />
              Chạy thuật toán điều độ
            </Button>
          </CardContent>
        </Card>

        {/* Gantt Chart */}
        {ganttChart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Biểu đồ Gantt</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center overflow-x-auto pb-4">
                  {ganttChart.map((item, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 border-2 border-gray-400 text-center text-sm font-medium relative"
                      style={{
                        backgroundColor: item.color,
                        width: `${(item.endTime - item.startTime) * 50}px`,
                        minWidth: "80px",
                        height: "80px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div className="text-white font-bold drop-shadow-md text-lg">
                        {item.processName}
                      </div>
                      <div className="text-white font-semibold drop-shadow-md text-xs mt-1">
                        {item.startTime} - {item.endTime}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center overflow-x-auto">
                  {ganttChart.map((item, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0 text-center relative border-r border-gray-300"
                      style={{
                        width: `${(item.endTime - item.startTime) * 50}px`,
                        minWidth: "80px",
                      }}
                    >
                      <div className="absolute left-0 -top-2 text-gray-700 font-semibold text-sm bg-white px-1 rounded">
                        {item.startTime}
                      </div>
                      {index === ganttChart.length - 1 && (
                        <div className="absolute right-0 -top-2 text-gray-700 font-semibold text-sm bg-white px-1 rounded">
                          {item.endTime}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Timeline Legend */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    Chú thích biểu đồ Gantt:
                  </h4>
                  <div className="space-y-2">
                    {Array.from(
                      {
                        length:
                          Math.max(...ganttChart.map((item) => item.endTime)) +
                          1,
                      },
                      (_, time) => {
                        const eventsAtTime: string[] = [];

                        // Check for process arrivals
                        processes.forEach((process) => {
                          if (process.arrivalTime === time) {
                            eventsAtTime.push(`${process.name} vào RQ`);
                          }
                        });

                        // Check for process starts and ends
                        ganttChart.forEach((segment) => {
                          if (segment.startTime === time && time > 0) {
                            eventsAtTime.push(
                              `${segment.processName} dùng CPU`
                            );
                          }
                          if (segment.endTime === time) {
                            // Check if process is completed
                            const processResult = results.find(
                              (r) => r.process.name === segment.processName
                            );
                            if (
                              processResult &&
                              processResult.endTime === time
                            ) {
                              eventsAtTime.push(
                                `${segment.processName} kết thúc`
                              );
                            }
                          }
                        });

                        if (eventsAtTime.length > 0) {
                          return (
                            <div
                              key={time}
                              className="flex items-start gap-2 text-xs"
                            >
                              <span className="font-semibold text-blue-600 min-w-[20px]">
                                {time}:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {eventsAtTime.map((event, index) => (
                                  <span key={index} className="text-gray-700">
                                    {event}
                                    {index < eventsAtTime.length - 1 ? "," : ""}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }
                    ).filter(Boolean)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Table */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Kết quả phân tích</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tiến trình</TableHead>
                      <TableHead>Thời điểm xuất hiện</TableHead>
                      <TableHead>Thời gian sử dụng CPU</TableHead>
                      <TableHead>Thời gian lưu lại hệ thống</TableHead>
                      <TableHead>Thời gian chờ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {result.process.name}
                        </TableCell>
                        <TableCell>{result.process.arrivalTime}</TableCell>
                        <TableCell>{result.process.burstTime}</TableCell>
                        <TableCell>{result.turnaroundTime}</TableCell>
                        <TableCell>{result.waitingTime}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900">
                      Thời gian chờ trung bình
                    </h3>
                    <p className="text-2xl font-bold text-blue-700">
                      {averageWaitingTime}
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-900">
                      Thời gian lưu lại hệ thống trung bình
                    </h3>
                    <p className="text-2xl font-bold text-green-700">
                      {averageTurnaroundTime}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Explanations */}
        <Card>
          <CardHeader>
            <CardTitle>Giải thích các thuật ngữ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-semibold text-blue-700">
                Thời gian lưu lại hệ thống (Turnaround Time):
              </h4>
              <p className="text-sm text-gray-600">
                = Thời điểm tiến trình kết thúc sử dụng CPU - Thời điểm xuất
                hiện
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-green-700">
                Thời gian chờ (Waiting Time):
              </h4>
              <p className="text-sm text-gray-600">
                = Thời gian lưu lại hệ thống - Thời gian sử dụng CPU
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <h4 className="font-semibold text-purple-700">FCFS:</h4>
                <p className="text-sm text-gray-600">
                  Tiến trình đến trước được phục vụ trước
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-700">SJF:</h4>
                <p className="text-sm text-gray-600">
                  Tiến trình có thời gian thực thi ngắn nhất được ưu tiên
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-700">Round Robin:</h4>
                <p className="text-sm text-gray-600">
                  Mỗi tiến trình được cấp phát CPU theo time quantum
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-700">SRTN:</h4>
                <p className="text-sm text-gray-600">
                  Tiến trình có thời gian còn lại ngắn nhất được ưu tiên
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
