import { ElButton, ElDialog, ElInput } from "element-plus";
import { createVNode, defineComponent, reactive, render } from "vue";

const DialogComponent = defineComponent({
  props: {
    option: { type: Object },
  },

  setup(props, ctx) {
    const state = reactive({
      isShow: false, // 控制dialog显示隐藏
      option: props.option, //用户给组件的属性
    });

    ctx.expose({
      showDialog(option) {
        state.isShow = true;
        state.option = option; // 每次点击dialog赋给他最新的option
      },
    });

    const onCancel = ()=>{
        state.isShow = false;
    }

    const onConfirm = ()=>{
        state.isShow = false;
        state.option.onConfirm && state.option.onConfirm(state.option.content);
    }

    return () => {
      return (
        <ElDialog v-model={state.isShow} title={state.option.title}>
          {{
            default: () => (
              <ElInput
                type="textarea"
                v-model={state.option.content}
                rows={10}
              ></ElInput>
            ),
            footer: () =>
              state.option.footer && (
                <div>
                  <ElButton onClick={onCancel}>取消</ElButton>
                  <ElButton type="primary" onClick={onConfirm}>
                    确认
                  </ElButton>
                </div>
              ),
          }}
        </ElDialog>
      );
    };
  },
});

let vm;
export function $dialog(option) {
  //手动挂载组件 new SubComponent.$mount()

  if (!vm) {
    let el = document.createElement("div");
    //将组件渲染成虚拟节点
    vm = createVNode(DialogComponent, { option });

    //将虚拟节点渲染成真实节点(需要将el渲染到页面中)
    document.body.appendChild((render(vm, el), el));
  }

  //将组件渲染到这个el元素上(听过这个实例找到他)
  let { showDialog } = vm.component.exposed;
  showDialog(option); //说明组件已经有了 只需要显示出来就好了
}
