import {
  computed,
  createVNode,
  defineComponent,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  reactive,
  ref,
  render,
} from "vue";

export const DropdownItem = defineComponent({
  props: {
    label: String,
    icon: String,
  },

  setup(props) {
    let { label, icon } = props;

    let hide = inject("hide");
    return () => (
      <div class="dropdown-item" onClick={hide}>
        <i class={icon}></i>
        <span>{label}</span>
      </div>
    );
  },
});

const DropdownComponent = defineComponent({
  props: {
    option: { type: Object },
  },

  setup(props, ctx) {
    const state = reactive({
      option: props.option,
      isShow: false,
      top: 0,
      left: 0,
    });

    ctx.expose({
      showDropDown(option) {
        state.option = option;
        state.isShow = true;
        let { top, left, height } = option.el.getBoundingClientRect();
        state.top = top + height;
        state.left = left;
      },
    });

    provide("hide", () => (state.isShow = false));

    const classes = computed(() => [
      "dropdown",
      {
        "dropdown-isShow": state.isShow,
      },
    ]);

    const styles = computed(() => ({
      top: state.top + "px",
      left: state.left + "px",
    }));

    const el = ref(null);

    const onMousedownDocument = (e) => {
      if (!el.value.contains(e.target)) {
        //如果点击的是drop内部 则什么都不做
        state.isShow = false;
      }
    };

    onBeforeUnmount(() => {
      document.body.removeEventListener("mousedown", onMousedownDocument);
    });

    onMounted(() => {
      //事件的传递行为是先捕获,在冒泡,
      // 之前为了阻止时间传播 我们给block增加了stopPropagation
      document.body.addEventListener("mousedown", onMousedownDocument, true);
    });

    return () => {
      return (
        <div class={classes.value} style={styles.value} ref={el}>
          {state.option.content()}
        </div>
      );
    };
  },
});

let vm;
export function $dropdown(option) {
  //手动挂载组件 new SubComponent.$mount()
  if (!vm) {
    let el = document.createElement("div");
    //将组件渲染成虚拟节点
    vm = createVNode(DropdownComponent, { option });

    //将虚拟节点渲染成真实节点(需要将el渲染到页面中)
    document.body.appendChild((render(vm, el), el));
  }

  //将组件渲染到这个el元素上(听过这个实例找到他)
  let { showDropDown } = vm.component.exposed;
  showDropDown(option); //说明组件已经有了 只需要显示出来就好了
}
