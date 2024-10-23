import { computed, ref } from 'vue'
export function useFocus(data, callback) { // 获取哪些元素被选中了


    const selectIndex = ref(-1); //表示没有任何一个被选中

    //最后选择的那个block
    const lastSelectBlock = computed(() => {
        return data.value.blocks[selectIndex.value];
    });

    const focusData = computed(() => {
        let focus = [];
        let unfocused = [];
        data.value.blocks.forEach(block => (block.focus ? focus : unfocused).push(block));
        return { focus, unfocused }
    });
    const clearBlockFocus = () => {
        data.value.blocks.forEach(block => block.focus = false);
    }
    const containerMousedown = () => {
        clearBlockFocus(); // 点击容器让选中的失去焦点

        selectIndex.value = -1;
    }
    const blockMousedown = (e, block, index) => {
        e.preventDefault();
        e.stopPropagation();
        // block上我们规划一个属性 focus 获取焦点后就将focus变为true
        if (e.shiftKey) {
            if (focusData.value.focus.length <= 1) {
                block.focus = true; //当只有一个节点被选中时 按住shift键 也不会取消焦点
            } else {
                block.focus = !block.focus;

            }
        } else {
            if (!block.focus) {
                clearBlockFocus();
                block.focus = true; // 要清空其他人focus属性
            } // 当自己已经是focus 属性时 在此点击还是选中状态
        }
        selectIndex.value = index;
        callback(e)
    }
    return {
        blockMousedown,
        containerMousedown,
        focusData,
        lastSelectBlock
    }
}