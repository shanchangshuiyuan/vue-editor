import { reactive } from "vue";
import { events } from "./events";

export function useBlockDragger(focusData, lastSelectBlock, data) {

    let dragState = {
        startX: 0,
        startY: 0
    }

    let markLine = reactive({
        x: null,
        y: null,
        dragging: false //默认不是正在拖拽
    });


    const mousedown = (e) => {

        const { width: BWidth, height: BHeight } = lastSelectBlock.value; //拖拽的最后元素

        dragState = {
            startX: e.clientX,
            startY: e.clientY, // 记录每一个选中的位置
            startLeft: lastSelectBlock.value.left, //b点拖拽前的位置(左右)
            startTop: lastSelectBlock.value.top, //）上下
            dragging: false, //正在拖拽的状态
            startPos: focusData.value.focus.map(({ top, left }) => ({ top, left })),
            lines: (() => {
                const { unfocused } = focusData.value; //获取其他没选中的以他们的位置做辅助线。 

                let lines = { x: [], y: [] }; //计算横辅助线的的位置用y来存放，竖辅助线的位置用x来存放

                [...unfocused,
                    {
                        top: 0,
                        left: 0,
                        width: data.value.container.width,
                        height: data.value.container.height
                    }

                ].forEach((block) => {
                    const { top: ATop, left: ALeft, width: AWidth, height: AHeight } = block;

                    //1.(顶对顶)当此元素做拽到与A元素top一致的时候，要显示这根x辅助线，辅助线的位置就是LeftLeft                lines.y.push({ showTop: ATop, top: ATop });
                    lines.y.push({ showTop: ATop, top: ATop });
                    //2.(顶对底)
                    lines.y.push({ showTop: ATop, top: ATop - BHeight });
                    //3.(中对中)
                    lines.y.push({ showTop: ATop + AHeight / 2, top: ATop + AHeight / 2 - BHeight / 2 });
                    //4.(底对顶)
                    lines.y.push({ showTop: ATop + AHeight, top: ATop + AHeight });
                    //5.(底对底)
                    lines.y.push({ showTop: ATop + AHeight, top: ATop + +AHeight - BHeight });


                    //1.(左对左)当此元素做拽到与A元素left一致的时候，要显示这根竖辅助线，辅助线的位置就是ALeft
                    lines.x.push({ showLeft: ALeft, left: ALeft });
                    //2.(右对左)
                    lines.x.push({ showLeft: ALeft + AWidth, left: ALeft + AWidth });
                    //3.(中对中)
                    lines.x.push({ showLeft: ALeft + AWidth / 2, left: ALeft + AWidth / 2 - BWidth / 2 });
                    //4.(右对右)
                    lines.x.push({ showLeft: ALeft + AWidth, left: ALeft + AWidth - BWidth });
                    //5.(左对右)
                    lines.x.push({ showLeft: ALeft + AWidth, left: ALeft - BWidth });
                })

                return lines;
            })()
        }
        document.addEventListener('mousemove', mousemove);
        document.addEventListener('mouseup', mouseup)
    }
    const mousemove = (e) => {
        let { clientX: moveX, clientY: moveY } = e;

        if (!dragState.dragging) { //制作container里面拖拽的撤销返回
            dragState.dragging = true;
            events.emit('start'); //触发时间就是记住拖拽的位置
        }

        //计算当前蒜素最新的left与top 去 辅助线数组里面找，找到显示该辅助线
        // 鼠标移动后 - 鼠标移动前 + left
        let left = moveX - dragState.startX + dragState.startLeft;
        let top = moveY - dragState.startY + dragState.startTop;

        //先计算横线 距离参照物还有5px时候，就显示这条线
        let y = null;
        for (let i = 0; i < dragState.lines.y.length; i++) {
            const { top: t, showTop: s } = dragState.lines.y[i]; //获取每一条线
            if (Math.abs(t - top) < 5) { //如果小于5 说明接近了 显示该条辅助线

                y = s; // 辅助线要显示的位置
                //实现快速和这个元素粘在一起
                // 容器距离顶部的距离 + 目标的高度 = 最新的moveY
                moveY = dragState.startY - dragState.startTop + t;
                break; //找到一根辅助线就跳出循环
            }
        }

        //先计算竖线 距离参照物还有5px时候，就显示这条线
        let x = null;
        for (let i = 0; i < dragState.lines.x.length; i++) {
            const { left: l, showLeft: s } = dragState.lines.x[i]; //获取每一条线
            if (Math.abs(l - left) < 5) { //如果小于5 说明接近了 显示该条辅助线

                x = s; // 辅助线要显示的位置
                //实现快速和这个元素粘在一起
                // 容器距离顶部的距离 + 目标的高度 = 最新的moveY
                moveX = dragState.startX - dragState.startLeft + l;
                break; //找到一根辅助线就跳出循环
            }
        }

        //markLine是一个响应式数据 x y变化后会导致视图更新
        markLine.x = x;
        markLine.y = y;

        let durX = moveX - dragState.startX; //之前与之后拖拽的距离
        let durY = moveY - dragState.startY;
        focusData.value.focus.forEach((block, idx) => {
            block.top = dragState.startPos[idx].top + durY;
            block.left = dragState.startPos[idx].left + durX;
        })
    }
    const mouseup = (e) => {
        document.removeEventListener('mousemove', mousemove);
        document.removeEventListener('mouseup', mouseup)


        //离开焦点时将辅助线给去掉
        markLine.x = null;
        markLine.y = null;

        if (dragState.dragging) { //如果只是点击就不会触发,移动后才会触发
            events.emit('end');
        }
    }

    return {
        mousedown,
        markLine
    }
}