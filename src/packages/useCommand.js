import deepcopy from "deepcopy";
import { events } from "./events";
import { onUnmounted } from "vue";

export function useCommand(data, focusData) {
    const state = { //存放所有曹组ode指针
        current: -1, //前进后退的索引值
        queue: [], //存放所有的操作命令
        commands: {}, //制作命令和执行功能的映射表 undo: ()=>{}  redo: ()=>{}
        commandArray: [], // 存放所有的命令
        destroyArray: [], // 销毁事件的列表
    }

    const registry = (command) => {
        state.commandArray.push(command);
        state.commands[command.name] = (...args) => { //命令名字对应的执行函数
            const { redo, undo } = command.execute(...args);
            redo();

            if (!command.pushQueue) return; //不需要放到队列中直接跳过即可

            let { queue, current } = state; //将拖拽行为放到队列中

            //如果先放了 组件1 => 组件2 => 撤回 => 组件3   结果 组件1 => 组件3

            if (queue.length > 0) { //点击redo undo 并没有操作队列 队列中还含有其他的组件
                queue = queue.slice(0, current + 1); //可能在放置的过程中,所以根据当前最近的current值来计算新的对
                state.queue = queue;
            }

            queue.push({ redo, undo }); //保存指令的前进后退
            state.current = current + 1;

            // console.log(queue);

        }
    };

    //注册我们所需要的命令
    registry({ //前进 (恢复)
        name: 'redo',
        keyBoard: "ctrl+y",
        execute() {
            return {
                redo() {
                    let item = state.queue[state.current + 1]; //找到当前的下一步 还原操作

                    if (item) { //实现撤销功能,返回他的前一步状态
                        item.redo && item.redo();
                        state.current++;
                    }
                }
            }
        }
    });

    //带有历史记录常用的模式
    registry({ //撤销  找到他的下一步
        name: 'undo',
        keyBoard: 'ctrl+z',
        execute() {
            return {
                redo() {
                    if (state.current == -1) return; //没有可以撤销的了
                    let item = state.queue[state.current];

                    if (item) { //实现撤销功能,返回他的前一步状态
                        item.undo && item.undo(); //这里没有操作队列
                        state.current--;
                    }

                }
            }
        }
    });

    registry({ //希望将操作放到队列中, 可以增加一个属性进行标识
        name: "drag",
        pushQueue: true,
        init() { //初始化操作,默认就会执行

            this.before = null

            //监控拖拽开始事件,保存事件
            const start = () => this.before = deepcopy(data.value.blocks);
            //拖拽结束需要触发的命令
            const end = () => {
                state.commands.drag()
            };
            events.on('start', start);
            events.on('end', end);

            return () => {
                events.off('start', start)
                events.off('end', end);
            }
        },
        execute() { //state.command.drag
            let before = this.before; //拖拽之前的状态
            let after = data.value.blocks; //拖拽之后的状态

            return {
                redo() { //默认一松手 就直接把当前的事情做了
                    data.value = {...data.value, blocks: after };
                },

                undo() {
                    data.value = {...data.value, blocks: before };
                }
            }
        }

    });

    registry({ //撤销  找到他的下一步
        name: 'updateContainer', //更新整个容器
        pushQueue: true,
        execute(newValue) { //接受传过来的参数

            let state = {
                before: data.value, //当前值
                after: newValue //新值
            };

            return {
                redo() {
                    data.value = state.after; //恢复
                },

                undo() {
                    data.value = state.before; // 回退
                }
            }
        }
    });

    registry({
        name: 'updateBlock', //更新某个容器
        pushQueue: true,
        execute(newBlock, oldBlock) { //接受传过来的参数

            let state = {
                before: data.value.blocks,
                after: (() => {
                    let blocks = [...data.value.blocks]; //先拷贝一份新的 在老的那份找到位置 在新的地方更改
                    const index = data.value.blocks.indexOf(oldBlock);
                    if (index > -1) {
                        blocks.splice(index, 1, newBlock);
                    }

                    return blocks;
                })()
            };

            return {
                redo() {
                    data.value = {...data.value, blocks: state.after }; //恢复
                },

                undo() {
                    data.value = {...data.value, blocks: state.before }; // 回退
                }
            }
        }
    });


    registry({ //置顶操作
        name: 'placeTop', //
        pushQueue: true,
        execute() { //接受传过来的参数

            let before = deepcopy(data.value.blocks); //之前的信息
            let after = (() => { //置顶就是在所有的block中 找到最大的zIndex
                let { focus, unfocused } = focusData.value;

                //找到其他未选中zIndex中的最大值
                let maxZIndex = unfocused.reduce((pre, block) => {
                    return Math.max(pre, block.zIndex);
                }, -Infinity);

                focus.forEach(block => block.zIndex = maxZIndex + 1); //让当前选中的比最大的zIndex + 1;

                return data.value.blocks;

            })();

            return {
                redo() {
                    data.value = {...data.value, blocks: after }; //恢复

                },

                undo() {
                    //如果当前 blocks 前后一致 则不会更新
                    data.value = {...data.value, blocks: before }; // 撤销
                }
            }
        }
    });
    registry({ //置底操作
        name: 'placeBottom', //
        pushQueue: true,
        execute() { //接受传过来的参数

            let before = deepcopy(data.value.blocks); //之前的信息
            let after = (() => { //置顶就是在所有的block中 找到最大的zIndex
                let { focus, unfocused } = focusData.value;

                //找到其他未选中zIndex中的最大值
                let minZIndex = unfocused.reduce((pre, block) => {
                    return Math.min(pre, block.zIndex);
                }, Infinity) - 1;

                //不能直接减1 以为 zIndex 不能出现负值
                if (minZIndex < 0) { //这里如果是负值,则让其变成0，其余的加上对应的层级就可以了
                    const dur = Math.abs(minZIndex);
                    minZIndex = 0;
                    unfocused.forEach(block => block.zIndex += dur);
                }

                focus.forEach(block => block.zIndex = minZIndex); //控制选中的值

                return data.value.blocks;

            })();

            return {
                redo() {
                    data.value = {...data.value, blocks: after }; //恢复

                },

                undo() {
                    //如果当前 blocks 前后一致 则不会更新
                    data.value = {...data.value, blocks: before }; // 撤销
                }
            }
        }
    });

    //注册我们所需要的命令
    registry({ //删除
        name: 'delete',
        pushQueue: true,
        execute() {

            let state = {
                before: deepcopy(data.value.blocks),
                after: focusData.value.unfocused, //选中的都删除了 留下的都是没选中的
            }

            return {
                redo() { //恢复
                    data.value = {...data.value, blocks: state.after };
                },

                undo() {
                    data.value = {...data.value, blocks: state.before }; //撤销
                }
            }
        }
    });

    const keyboardEvent = (() => {

        const keyCodes = {
            90: 'z',
            89: 'y'
        };


        const onKeyDown = (e) => {
            const { ctrlKey, keyCode } = e; //ctrl+Z ctrl+y (组合起来)

            let keyString = [];

            if (ctrlKey) keyString.push('ctrl');
            keyString.push(keyCodes[keyCode]);
            keyString = keyString.join("+");

            //执行command中的键盘事件
            state.commandArray.forEach(({ keyBoard, name }) => {
                if (!keyBoard) return; //没有键盘事件
                if (keyBoard === keyString) { //注册函数中已经事先注册好了
                    state.commands[name]();
                    e.preventDefault();
                }
            })
        };

        const init = () => { //初始化事件

            window.addEventListener('keydown', onKeyDown);

            return () => { // 销毁事件
                window.removeEventListener('keydown', onKeyDown);
            }
        }

        return init;
    })();

    //自执行函数
    (() => {
        //监听键盘事件
        state.destroyArray.push(keyboardEvent()); //放到销毁时间队列 并执行 init()事件
        state.commandArray.forEach((command) => command.init && state.destroyArray.push(command.init()));
    })();

    onUnmounted(() => { //清理绑定的事件
        state.destroyArray.forEach((fn) => fn && fn());
    })

    return state;
}