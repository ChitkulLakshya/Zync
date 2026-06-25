const { getInspiration } = require('./controllers/inspirationController');
const { performance } = require('perf_hooks');

const iterations = 100;
const query = 'ai';


const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function suppressOutput() {
    console.log = () => {};
    console.warn = () => {};

}

function restoreOutput() {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
}

async function runBenchmark() {
    let totalTime = 0;
    let itemCount = 0;

    console.log(`Starting benchmark with ${iterations} iterations...`);
    suppressOutput();

    for (let i = 0; i < iterations; i++) {
        const req = { query: { q: query } };

        const res = {
            json: (data) => {
                itemCount = data.count;
            },
            status: (code) => res
        };

        const start = performance.now();
        await getInspiration(req, res);
        const end = performance.now();
        totalTime += (end - start);
    }

    restoreOutput();

    const averageTime = totalTime / iterations;
    console.log(`Average execution time: ${averageTime.toFixed(4)} ms`);
    console.log(`Items returned: ${itemCount}`);
}

runBenchmark();
